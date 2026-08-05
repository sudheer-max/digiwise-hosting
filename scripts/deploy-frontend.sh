#!/bin/bash
set -euo pipefail

# DigiWise Hosting - Frontend Deployment
# Deploys the Next.js frontend to K3s

echo "=========================================="
echo " Deploying Frontend to K3s"
echo "=========================================="

# Use the correct kubeconfig
export KUBECONFIG=~/.kube/config-digiwise

# Configuration
FRONTEND_IMAGE="${FRONTEND_IMAGE:-digiwise-frontend:latest}"
HARBOR_URL="${HARBOR_URL:-harbor.digiwisesoftech.com}"
HARBOR_PROJECT="${HARBOR_PROJECT:-digiwise}"
NAMESPACE="digiwise-frontend"

# Step 1: Build Docker image
echo "[1/4] Building frontend Docker image..."
cd frontend

# Build the image
docker build -t $FRONTEND_IMAGE .

# Tag for Harbor
docker tag $FRONTEND_IMAGE $HARBOR_URL/$HARBOR_PROJECT/$FRONTEND_IMAGE

# Step 2: Push to Harbor
echo "[2/4] Pushing to Harbor registry..."
docker login $HARBOR_URL
docker push $HARBOR_URL/$HARBOR_PROJECT/$FRONTEND_IMAGE

cd ..

# Step 3: Create Kubernetes namespace
echo "[3/4] Creating namespace..."
kubectl create namespace $NAMESPACE 2>/dev/null || true

# Step 4: Deploy to Kubernetes
echo "[4/4] Deploying frontend..."
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: digiwise-frontend
  namespace: $NAMESPACE
  labels:
    app: digiwise-frontend
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
          image: $HARBOR_URL/$HARBOR_PROJECT/$FRONTEND_IMAGE
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "200m"
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: digiwise-frontend
  namespace: $NAMESPACE
spec:
  selector:
    app: digiwise-frontend
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: digiwise-frontend-ingress
  namespace: $NAMESPACE
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: traefik
  rules:
    - host: digiwisesoftech.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: digiwise-frontend
                port:
                  number: 80
    - host: www.digiwisesoftech.com
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
        - digiwisesoftech.com
        - www.digiwisesoftech.com
      secretName: frontend-tls
EOF

echo ""
echo "=========================================="
echo " Frontend Deployment Complete!"
echo "=========================================="
echo ""
echo "Frontend deployed to: https://digiwisesoftech.com"
echo ""
echo "Verify deployment:"
echo "  kubectl get pods -n $NAMESPACE"
echo "  kubectl logs -f deployment/digiwise-frontend -n $NAMESPACE"
