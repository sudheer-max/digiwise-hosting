#!/bin/bash
# Deploy Stalwart Mail Server on K3s
set -e

echo "=== Creating Stalwart namespace ==="
kubectl apply -f k8s/stalwart/namespace.yaml

echo "=== Applying secrets ==="
kubectl apply -f k8s/stalwart/secret.yaml

echo "=== Applying config ==="
kubectl apply -f k8s/stalwart/configmap.yaml

echo "=== Deploying Stalwart StatefulSet ==="
kubectl apply -f k8s/stalwart/statefulset.yaml

echo "=== Creating services ==="
kubectl apply -f k8s/stalwart/services.yaml

echo "=== Waiting for Stalwart to be ready ==="
kubectl rollout status statefulset/stalwart -n stalwart --timeout=120s

echo ""
echo "=== Stalwart deployed! ==="
echo "Management API: http://localhost:8080 (port-forward)"
echo "SMTP: node-ip:30025"
echo "Submission: node-ip:30587"
echo "IMAP: node-ip:30143"
echo "IMAPS: node-ip:30993"
echo ""
echo "Run this to access the management UI:"
echo "  kubectl port-forward -n stalwart svc/stalwart-mgmt 8080:8080"
echo ""
echo "Then open: http://localhost:8080"
echo "Login: admin / DigiWise@2026"
