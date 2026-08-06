#!/bin/bash
set -euo pipefail

# DigiWise Hosting - cert-manager Deployment
# Deploys cert-manager for automatic TLS certificates with Let's Encrypt

echo "=========================================="
echo " Deploying cert-manager to K3s"
echo "=========================================="

# Use the correct kubeconfig
export KUBECONFIG=~/.kube/config-digiwise

# Step 1: Install cert-manager via Helm
echo "[1/3] Installing cert-manager..."
helm repo add jetstack https://charts.jetstack.io 2>/dev/null || true
helm repo update

kubectl create namespace cert-manager 2>/dev/null || true

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --set crds.enabled=true \
  --set prometheus.enabled=true \
  --wait

echo "✅ cert-manager installed"

# Step 2: Create ClusterIssuer for Let's Encrypt Production
echo "[2/3] Creating Let's Encrypt ClusterIssuer..."
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@digiwisesoftech.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            class: traefik
EOF

echo "✅ Let's Encrypt production issuer created"

# Step 3: Create ClusterIssuer for Let's Encrypt Staging (for testing)
echo "[3/3] Creating Let's Encrypt Staging ClusterIssuer..."
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@digiwisesoftech.com
    privateKeySecretRef:
      name: letsencrypt-staging-account-key
    solvers:
      - http01:
          ingress:
            class: traefik
EOF

echo "✅ Let's Encrypt staging issuer created"

# Verify installation
echo ""
echo "Verifying cert-manager pods..."
kubectl get pods -n cert-manager

echo ""
echo "Verifying ClusterIssuers..."
kubectl get clusterissuers

echo ""
echo "=========================================="
echo " cert-manager Deployment Complete!"
echo "=========================================="
echo ""
echo "Components deployed:"
echo "  - cert-manager: Certificate management (namespace: cert-manager)"
echo "  - ClusterIssuer: letsencrypt-prod (production)"
echo "  - ClusterIssuer: letsencrypt-staging (testing)"
echo ""
echo "Usage:"
echo "  - Add annotation to Ingress: cert-manager.io/cluster-issuer: letsencrypt-prod"
echo "  - cert-manager will automatically provision TLS certificates"
echo ""
echo "Next steps:"
echo "  1. Deploy database operators: ./scripts/deploy-database-operators.sh"
echo "  2. Deploy monitoring stack: ./scripts/deploy-monitoring.sh"
