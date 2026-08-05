#!/bin/bash
set -euo pipefail

# DigiWise Hosting - Core Services Deployment
# Deploys Traefik, Longhorn, ArgoCD, Harbor, MinIO

echo "=========================================="
echo " Deploying Core Services to K3s"
echo "=========================================="

# Use the correct kubeconfig
export KUBECONFIG=~/.kube/config-digiwise

# Step 1: Deploy Traefik (Ingress Controller)
echo "[1/5] Deploying Traefik..."
helm repo add traefik https://traefik.github.io/charts 2>/dev/null || true
helm repo update

helm install traefik traefik/traefik \
  --namespace traefik \
  --create-namespace \
  --set ports.websecure.redirectTo=websecure \
  --set service.type=LoadBalancer \
  --set service.annotations."service\.beta\.kubernetes\.io/linode-loadbalancer-config"="https://www.googleapis.com/compute/v1/projects/PROJECT_ID/global/networks/NETWORK_NAME" \
  --wait

echo "✅ Traefik deployed"

# Step 2: Deploy Longhorn (Persistent Storage)
echo "[2/5] Deploying Longhorn..."
helm repo add longhorn https://charts.longhorn.io 2>/dev/null || true
helm repo update

helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --set defaultSettings.defaultReplicaCount=1 \
  --set persistence.defaultClassReplicaCount=1 \
  --wait

echo "✅ Longhorn deployed"

# Step 3: Deploy ArgoCD (GitOps)
echo "[3/5] Deploying ArgoCD..."
kubectl create namespace argocd 2>/dev/null || true

kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
kubectl wait --for=condition=available deployment/argocd-server -n argocd --timeout=300s

echo "✅ ArgoCD deployed"

# Step 4: Deploy Harbor (Container Registry)
echo "[4/5] Deploying Harbor..."
helm repo add harbor https://helm.goharbor.io 2>/dev/null || true
helm repo update

# Create namespace
kubectl create namespace harbor 2>/dev/null || true

# Install Harbor with persistent storage
helm install harbor harbor/harbor \
  --namespace harbor \
  --set expose.type=ingress \
  --set expose.ingress.hosts.core=harbor.digiwisesoftech.com \
  --set expose.ingress.hosts.notary=notary.digiwisesoftech.com \
  --set persistence.enabled=true \
  --set persistence.persistentVolumeClaim.registry.storageClass=longhorn \
  --set persistence.persistentVolumeClaim.registry.size=50Gi \
  --set persistence.persistentVolumeClaim.database.storageClass=longhorn \
  --set persistence.persistentVolumeClaim.database.size=5Gi \
  --set persistence.persistentVolumeClaim.redis.storageClass=longhorn \
  --set persistence.persistentVolumeClaim.redis.size=1Gi \
  --set persistence.persistentVolumeClaim.trivy.storageClass=longhorn \
  --set persistence.persistentVolumeClaim.trivy.size=5Gi \
  --wait

echo "✅ Harbor deployed"

# Step 5: Deploy MinIO (Object Storage)
echo "[5/5] Deploying MinIO..."
helm repo add minio https://charts.min.io 2>/dev/null || true
helm repo update

# Generate random credentials
MINIO_ROOT_USER="digiwise-admin"
MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)

kubectl create namespace minio 2>/dev/null || true

helm install minio minio/minio \
  --namespace minio \
  --set rootUser=$MINIO_ROOT_USER \
  --set rootPassword=$MINIO_ROOT_PASSWORD \
  --set mode=standalone \
  --set persistence.enabled=true \
  --set persistence.size=100Gi \
  --set persistence.storageClass=longhorn \
  --set service.type=ClusterIP \
  --set consoleservice.type=ClusterIP \
  --wait

echo "✅ MinIO deployed"

# Save credentials to a secret
kubectl create secret generic digiwse-minio-credentials \
  --from-literal=MINIO_ROOT_USER=$MINIO_ROOT_USER \
  --from-literal=MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD \
  --namespace minio \
  --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo "=========================================="
echo " Core Services Deployment Complete!"
echo "=========================================="
echo ""
echo "Services deployed:"
echo "  - Traefik: Ingress controller (LoadBalancer)"
echo "  - Longhorn: Persistent storage"
echo "  - ArgoCD: GitOps deployment"
echo "  - Harbor: Container registry"
echo "  - MinIO: Object storage"
echo ""
echo "MinIO credentials saved to: minio/digiwise-minio-credentials"
echo ""
echo "Next steps:"
echo "1. Deploy database operators: ./scripts/deploy-database-operators.sh"
echo "2. Deploy monitoring stack: ./scripts/deploy-monitoring.sh"
