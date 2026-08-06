#!/bin/bash
set -euo pipefail

# DigiWise Hosting - Full Platform Deployment
# Deploys the complete PaaS platform on K3s

echo "=========================================="
echo " DigiWise Hosting - Full Platform Deploy"
echo "=========================================="

# Use the correct kubeconfig
export KUBECONFIG=~/.kube/config-digiwise

# Configuration
REGISTRY="harbor.digiwisesoftech.com"
PROJECT="digiwise"
BACKEND_IMAGE="${REGISTRY}/${PROJECT}/digiwise-backend"
FRONTEND_IMAGE="${REGISTRY}/${PROJECT}/digiwise-frontend"
DOMAIN="digiwisesoftech.com"
API_DOMAIN="api.${DOMAIN}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# Step 1: Verify prerequisites
echo ""
echo "[1/8] Verifying prerequisites..."

# Check kubectl
command -v kubectl >/dev/null 2>&1 || err "kubectl not found"

# Check helm
command -v helm >/dev/null 2>&1 || err "helm not found"

# Check K3s
kubectl get nodes >/dev/null 2>&1 || err "K3s cluster not accessible"

log "Prerequisites verified"

# Step 2: Deploy cert-manager
echo ""
echo "[2/8] Deploying cert-manager..."
if kubectl get namespace cert-manager >/dev/null 2>&1; then
  warn "cert-manager already installed"
else
  ./scripts/deploy-cert-manager.sh
fi
log "cert-manager ready"

# Step 3: Deploy core services (if not already deployed)
echo ""
echo "[3/8] Verifying core services..."

check_service() {
  local ns=$1
  local name=$2
  if kubectl get namespace "$ns" >/dev/null 2>&1; then
    log "$name already deployed (namespace: $ns)"
  else
    warn "$name not found - deploying..."
    ./scripts/deploy-core-services.sh
    break
  fi
}

check_service "traefik" "Traefik"
check_service "longhorn-system" "Longhorn"
check_service "argocd" "ArgoCD"
check_service "harbor" "Harbor"
check_service "minio" "MinIO"

# Step 4: Deploy database operators (if not already deployed)
echo ""
echo "[4/8] Verifying database operators..."

if kubectl get namespace postgresql >/dev/null 2>&1; then
  log "Database operators already deployed"
else
  ./scripts/deploy-database-operators.sh
fi

# Step 5: Deploy monitoring stack (if not already deployed)
echo ""
echo "[5/8] Verifying monitoring stack..."

if kubectl get namespace monitoring >/dev/null 2>&1; then
  log "Monitoring stack already deployed"
else
  ./scripts/deploy-monitoring.sh
fi

# Step 6: Create namespaces
echo ""
echo "[6/8] Creating namespaces..."

for ns in digiwise-backend digiwise-frontend digiwise-databases; do
  kubectl create namespace "$ns" 2>/dev/null || true
done
log "Namespaces created"

# Step 7: Deploy backend
echo ""
echo "[7/8] Deploying backend..."

cd backend

# Build Docker image
log "Building backend Docker image..."
docker build -t ${BACKEND_IMAGE}:latest .

# Push to Harbor
log "Pushing to Harbor registry..."
docker push ${BACKEND_IMAGE}:latest

cd ..

# Apply backend manifests
log "Applying backend manifests..."
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: digiwise-api
  namespace: digiwise-backend
  labels:
    app: digiwise-api
    managed-by: digiwise-hosting
spec:
  replicas: 2
  selector:
    matchLabels:
      app: digiwise-api
  template:
    metadata:
      labels:
        app: digiwise-api
    spec:
      containers:
        - name: api
          image: ${BACKEND_IMAGE}:latest
          ports:
            - containerPort: 4000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: digiwise-db-credentials
                  key: url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: digiwise-jwt-secret
                  key: secret
            - name: NODE_ENV
              value: production
          resources:
            requests:
              memory: 256Mi
              cpu: 250m
            limits:
              memory: 512Mi
              cpu: 500m
          livenessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 5
            periodSeconds: 5
      imagePullSecrets:
        - name: harbor-registry-secret
---
apiVersion: v1
kind: Service
metadata:
  name: digiwise-api
  namespace: digiwise-backend
spec:
  selector:
    app: digiwise-api
  ports:
    - port: 4000
      targetPort: 4000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: digiwise-api
  namespace: digiwise-backend
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: traefik
  rules:
    - host: ${API_DOMAIN}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: digiwise-api
                port:
                  number: 4000
  tls:
    - hosts:
        - ${API_DOMAIN}
      secretName: api-tls
EOF

log "Backend deployed"

# Step 8: Deploy frontend
echo ""
echo "[8/8] Deploying frontend..."

cd frontend

# Build Docker image
log "Building frontend Docker image..."
docker build -t ${FRONTEND_IMAGE}:latest .

# Push to Harbor
log "Pushing to Harbor registry..."
docker push ${FRONTEND_IMAGE}:latest

cd ..

# Apply frontend manifests
log "Applying frontend manifests..."
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: digiwise-frontend
  namespace: digiwise-frontend
  labels:
    app: digiwise-frontend
    managed-by: digiwise-hosting
spec:
  replicas: 2
  selector:
    matchLabels:
      app: digiwise-frontend
  template:
    metadata:
      labels:
        app: digiwise-frontend
    spec:
      containers:
        - name: frontend
          image: ${FRONTEND_IMAGE}:latest
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: 64Mi
              cpu: 50m
            limits:
              memory: 128Mi
              cpu: 100m
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 5
      imagePullSecrets:
        - name: harbor-registry-secret
---
apiVersion: v1
kind: Service
metadata:
  name: digiwise-frontend
  namespace: digiwise-frontend
spec:
  selector:
    app: digiwise-frontend
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: digiwise-frontend
  namespace: digiwise-frontend
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: traefik
  rules:
    - host: ${DOMAIN}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: digiwise-frontend
                port:
                  number: 80
    - host: www.${DOMAIN}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: digiwise-frontend
                port:
                  number: 80
  tls:
    - hosts:
        - ${DOMAIN}
        - www.${DOMAIN}
      secretName: frontend-tls
EOF

log "Frontend deployed"

# Create Harbor registry secret
kubectl create secret docker-registry harbor-registry-secret \
  --namespace=digiwise-backend \
  --docker-server=${REGISTRY} \
  --docker-username=admin \
  --docker-password=Harbor12345 \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret docker-registry harbor-registry-secret \
  --namespace=digiwise-frontend \
  --docker-server=${REGISTRY} \
  --docker-username=admin \
  --docker-password=Harbor12345 \
  --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo "=========================================="
echo " Platform Deployment Complete!"
echo "=========================================="
echo ""
echo "Services deployed:"
echo "  - cert-manager: Automatic TLS certificates"
echo "  - Traefik: Ingress controller"
echo "  - Longhorn: Persistent storage"
echo "  - ArgoCD: GitOps deployment"
echo "  - Harbor: Container registry"
echo "  - MinIO: Object storage"
echo "  - CloudNativePG: PostgreSQL operator"
echo "  - Percona: MongoDB operator"
echo "  - Spotahome: Redis operator"
echo "  - Prometheus + Grafana: Monitoring"
echo "  - Loki: Log aggregation"
echo "  - DigiWise API: Backend (port 4000)"
echo "  - DigiWise Frontend: Web UI (port 80)"
echo ""
echo "URLs:"
echo "  - Frontend: https://${DOMAIN}"
echo "  - API: https://${API_DOMAIN}"
echo "  - API Docs: https://${API_DOMAIN}/docs"
echo "  - Grafana: https://grafana.${DOMAIN}"
echo ""
echo "Next steps:"
echo "  1. Create admin user: UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"
echo "  2. Configure Cloudflare DNS to point to your cluster IP"
echo "  3. Access the console and create your first project"
