#!/bin/bash
set -euo pipefail

# DigiWise Hosting - Backend Deployment
# Deploys the Fastify backend API to K3s

echo "=========================================="
echo " Deploying Backend API to K3s"
echo "=========================================="

# Use the correct kubeconfig
export KUBECONFIG=~/.kube/config-digiwise

# Configuration
BACKEND_IMAGE="${BACKEND_IMAGE:-digiwise-backend:latest}"
HARBOR_URL="${HARBOR_URL:-harbor.digiwisesoftech.com}"
HARBOR_PROJECT="${HARBOR_PROJECT:-digiwise}"
NAMESPACE="digiwise-backend"

# Step 1: Build Docker image
echo "[1/4] Building backend Docker image..."
cd backend

# Build the image
docker build -t $BACKEND_IMAGE .

# Tag for Harbor
docker tag $BACKEND_IMAGE $HARBOR_URL/$HARBOR_PROJECT/$BACKEND_IMAGE

# Step 2: Push to Harbor
echo "[2/4] Pushing to Harbor registry..."
docker login $HARBOR_URL
docker push $HARBOR_URL/$HARBOR_PROJECT/$BACKEND_IMAGE

cd ..

# Step 3: Create Kubernetes namespace and secrets
echo "[3/4] Creating namespace and secrets..."
kubectl create namespace $NAMESPACE 2>/dev/null || true

# Create secrets from .env file
kubectl create secret generic backend-secrets \
  --from-file=.env=backend/.env.production \
  --namespace $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

# Create TLS secret for backend
kubectl create secret tls backend-tls \
  --cert=/path/to/cert.pem \
  --key=/path/to/key.pem \
  --namespace $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f - || true

# Step 4: Deploy to Kubernetes
echo "[4/4] Deploying backend..."
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: digiwise-api
  namespace: $NAMESPACE
  labels:
    app: digiwise-api
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
          image: $HARBOR_URL/$HARBOR_PROJECT/$BACKEND_IMAGE
          ports:
            - containerPort: 4000
          envFrom:
            - secretRef:
                name: backend-secrets
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
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
---
apiVersion: v1
kind: Service
metadata:
  name: digiwise-api
  namespace: $NAMESPACE
spec:
  selector:
    app: digiwise-api
  ports:
    - port: 80
      targetPort: 4000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: digiwise-api-ingress
  namespace: $NAMESPACE
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: traefik
  rules:
    - host: api.digiwisesoftech.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: digiwise-api
                port:
                  number: 80
  tls:
    - hosts:
        - api.digiwisesoftech.com
      secretName: api-tls
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: digiwise-api-pdb
  namespace: $NAMESPACE
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: digiwise-api
EOF

echo ""
echo "=========================================="
echo " Backend Deployment Complete!"
echo "=========================================="
echo ""
echo "Backend API deployed to: https://api.digiwisesoftech.com"
echo ""
echo "Verify deployment:"
echo "  kubectl get pods -n $NAMESPACE"
echo "  kubectl logs -f deployment/digiwise-api -n $NAMESPACE"
