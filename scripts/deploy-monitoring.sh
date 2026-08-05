#!/bin/bash
set -euo pipefail

# DigiWise Hosting - Monitoring Stack Deployment
# Deploys Prometheus, Grafana, Loki

echo "=========================================="
echo " Deploying Monitoring Stack to K3s"
echo "=========================================="

# Use the correct kubeconfig
export KUBECONFIG=~/.kube/config-digiwise

# Step 1: Deploy Prometheus + Grafana (kube-prometheus-stack)
echo "[1/2] Deploying Prometheus + Grafana..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
helm repo update

kubectl create namespace monitoring 2>/dev/null || true

helm install kube-prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set grafana.adminPassword=admin123 \
  --set grafana.service.type=ClusterIP \
  --set prometheus.service.type=ClusterIP \
  --set alertmanager.service.type=ClusterIP \
  --set prometheus.prometheusSpec.retention=15d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName=longhorn \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
  --wait

echo "✅ Prometheus + Grafana deployed"

# Step 2: Deploy Loki (Log Aggregation)
echo "[2/2] Deploying Loki..."
helm repo add grafana https://grafana.github.io/helm-charts 2>/dev/null || true
helm repo update

helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set loki.persistence.enabled=true \
  --set loki.persistence.storageClassName=longhorn \
  --set loki.persistence.size=30Gi \
  --set promtail.enabled=true \
  --set grafana.enabled=false \
  --wait

echo "✅ Loki deployed"

# Create Ingress for Grafana
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana-ingress
  namespace: monitoring
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: traefik
  rules:
    - host: grafana.digiwisesoftech.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: kube-prometheus-grafana
                port:
                  number: 80
  tls:
    - hosts:
        - grafana.digiwisesoftech.com
      secretName: grafana-tls
EOF

echo ""
echo "=========================================="
echo " Monitoring Stack Deployment Complete!"
echo "=========================================="
echo ""
echo "Services deployed:"
echo "  - Prometheus: Metrics collection (namespace: monitoring)"
echo "  - Grafana: Dashboards (namespace: monitoring)"
echo "  - Loki: Log aggregation (namespace: monitoring)"
echo ""
echo "Access:"
echo "  - Grafana: https://grafana.digiwisesoftech.com"
echo "  - Default credentials: admin / admin123"
echo ""
echo "Next steps:"
echo "1. Deploy backend: ./scripts/deploy-backend.sh"
echo "2. Deploy frontend: ./scripts/deploy-frontend.sh"
