#!/bin/bash
set -euo pipefail

# DigiWise Hosting - PostgreSQL Deployment
# Deploys CloudNativePG operator + PostgreSQL cluster

VPS_IP="${VPS_IP:-172.105.49.201}"
SSH_USER="${SSH_USER:-root}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo " DigiWise PostgreSQL Deployment"
echo "=========================================="

# Use the correct kubeconfig
export KUBECONFIG=~/.kube/config-digiwise

# Step 1: Deploy CloudNativePG Operator
echo "[1/4] Deploying CloudNativePG operator..."
kubectl create namespace digiwise-databases 2>/dev/null || true

kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.23/releases/cnpg-1.23.0.yaml

echo "Waiting for operator to be ready..."
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=cloudnative-pg \
  -n postgresql --timeout=120s 2>/dev/null || true
echo "✅ CloudNativePG operator deployed"

# Step 2: Deploy PostgreSQL Cluster
echo "[2/4] Deploying PostgreSQL cluster..."
kubectl apply -f "$SCRIPT_DIR/../k8s/base/postgresql.yaml"

echo "Waiting for PostgreSQL pod to be ready..."
kubectl wait --for=condition=Ready pod -l cnpg.io/cluster=digiwise-postgres \
  -n digiwise-databases --timeout=180s 2>/dev/null || true
echo "✅ PostgreSQL cluster deployed"

# Step 2.5: Open firewall port for NodePort
echo "[2.5/4] Opening firewall port 30543..."
ssh $SSH_USER@$VPS_IP << 'FIREWALL' || true
ufw allow 30543/tcp >/dev/null 2>&1
echo "✅ Firewall port 30543 opened"
FIREWALL

# Step 3: Verify PostgreSQL is running
echo "[3/4] Verifying PostgreSQL..."
kubectl get pods -n digiwise-databases
kubectl get svc -n digiwise-databases

# Step 4: Test connection
echo "[4/4] Testing database connection..."
sleep 5
kubectl exec -n digiwise-databases \
  $(kubectl get pods -n digiwise-databases -l cnpg.io/cluster=digiwise-postgres -o jsonpath='{.items[0].metadata.name}') \
  -- psql -U digiwise-db -d digiwise -c "SELECT 1 AS connection_test;" 2>/dev/null && \
  echo "✅ Database connection successful" || \
  echo "⚠️  Database still starting up, try again in a few seconds"

echo ""
echo "=========================================="
echo " PostgreSQL Deployment Complete!"
echo "=========================================="
echo ""
echo "Database Details:"
echo "  Namespace:   digiwise-databases"
echo "  Cluster:     digiwise-postgres"
echo "  Database:    digiwise"
echo "  User:        digiwise-db"
echo "  Password:    digiwise-password"
echo "  Internal:    digiwise-postgres-rw.digiwise-databases.svc:5432"
echo "  External:    $VPS_IP:30543 (NodePort)"
echo ""
echo "Next steps:"
echo "1. Create DNS record: db.digiwisesoftech.com → $VPS_IP"
echo "   (Or use $VPS_IP:30543 directly in .env for testing)"
echo "2. Update backend .env DATABASE_URL"
echo "   DATABASE_URL=\"postgresql://digiwise-db:digiwise-password@$VPS_IP:30543/digiwise\""
echo ""
