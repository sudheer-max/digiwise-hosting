#!/bin/sh
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
CA=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
SERVER="https://${KUBERNETES_SERVICE_HOST}:${KUBERNETES_SERVICE_PORT}"
mkdir -p /root/.kube
cat > /root/.kube/config << EOF
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority: ${CA}
    server: ${SERVER}
  name: default
contexts:
- context:
    cluster: default
    user: default
  name: default
current-context: default
users:
- name: default
  user:
    token: ${TOKEN}
EOF
exec "$@"
