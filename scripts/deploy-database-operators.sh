#!/bin/bash
set -euo pipefail

# DigiWise Hosting - Database Operators Deployment
# Deploys PostgreSQL Operator, MongoDB Operator, Redis Operator

echo "=========================================="
echo " Deploying Database Operators to K3s"
echo "=========================================="

# Use the correct kubeconfig
export KUBECONFIG=~/.kube/config-digiwise

# Step 1: Deploy PostgreSQL Operator (CloudNativePG)
echo "[1/3] Deploying CloudNativePG..."
kubectl create namespace postgresql 2>/dev/null || true

kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.23/releases/cnpg-1.23.0.yaml

echo "✅ CloudNativePG deployed"

# Step 2: Deploy MongoDB Operator (Percona)
echo "[2/3] Deploying Percona MongoDB Operator..."
kubectl create namespace mongodb 2>/dev/null || true

kubectl apply -n mongodb -f https://raw.githubusercontent.com/percona/percona-server-mongodb-operator/v1.15.0/deploy/bundle.yaml

echo "✅ Percona MongoDB Operator deployed"

# Step 3: Deploy Redis Operator (Spotahome)
echo "[3/3] Deploying Spotahome Redis Operator..."
kubectl create namespace redis 2>/dev/null || true

kubectl apply -n redis -f https://raw.githubusercontent.com/spotahome/redis-operator/master/manifests/databases.spotahome.com_redisfailovers_crd.yaml
kubectl apply -n redis -f https://raw.githubusercontent.com/spotahome/redis-operator/master/manifests/operator.yaml

echo "✅ Spotahome Redis Operator deployed"

# Verify operators are running
echo ""
echo "Verifying operators..."
kubectl get pods -n postgresql
kubectl get pods -n mongodb
kubectl get pods -n redis

echo ""
echo "=========================================="
echo " Database Operators Deployment Complete!"
echo "=========================================="
echo ""
echo "Operators deployed:"
echo "  - CloudNativePG: PostgreSQL operator (namespace: postgresql)"
echo "  - Percona: MongoDB operator (namespace: mongodb)"
echo "  - Spotahome: Redis operator (namespace: redis)"
echo ""
echo "Next steps:"
echo "1. Deploy monitoring stack: ./scripts/deploy-monitoring.sh"
echo "2. Deploy backend: ./scripts/deploy-backend.sh"
