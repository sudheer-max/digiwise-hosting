#!/bin/bash
set -euo pipefail

# DigiWise Hosting - K3s Setup Script
# Reuses existing Linode VPS (172.105.49.201)
# Removes Dokploy and installs K3s with production stack

VPS_IP="${VPS_IP:-172.105.49.201}"
SSH_USER="${SSH_USER:-root}"
K3S_VERSION="${K3S_VERSION:-v1.31.4+k3s1}"

echo "=========================================="
echo " DigiWise Hosting - K3s Cluster Setup"
echo "=========================================="
echo "VPS IP: $VPS_IP"
echo "SSH User: $SSH_USER"
echo ""

# Step 1: Clean up existing Docker/Dokploy installation
echo "[1/8] Cleaning up existing Docker/Dokploy..."
ssh $SSH_USER@$VPS_IP << 'CLEANUP'
# Stop all running containers
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm -f $(docker ps -aq) 2>/dev/null || true

# Remove Docker
apt-get remove -y docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>/dev/null || true
apt-get autoremove -y

# Clean up Docker data
rm -rf /var/lib/docker
rm -rf /etc/docker

# Remove Dokploy
rm -rf /root/dokploy
rm -rf /etc/dokploy

echo "✅ Cleanup complete"
CLEANUP

# Step 2: Install K3s
echo "[2/8] Installing K3s..."
ssh $SSH_USER@$VPS_IP << K3S_INSTALL
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="$K3S_VERSION" sh -s - server \
  --disable traefik \
  --write-kubeconfig-mode 644 \
  --tls-san=$VPS_IP \
  --tls-san=digiwisesoftech.com \
  --tls-san=*.digiwisesoftech.com
K3S_INSTALL

# Step 3: Configure kubectl
echo "[3/8] Configuring kubectl..."
ssh $SSH_USER@$VPS_IP << 'KUBECTL'
mkdir -p /root/.kube
cp /etc/rancher/k3s/k3s.yaml /root/.kube/config
chmod 600 /root/.kube/config

# Also copy for non-root users if needed
if [ -n "$SUDO_USER" ]; then
  mkdir -p /home/$SUDO_USER/.kube
  cp /etc/rancher/k3s/k3s.yaml /home/$SUDO_USER/.kube/config
  chown $SUDO_USER:$SUDO_USER /home/$SUDO_USER/.kube/config
fi

echo "✅ kubectl configured"
KUBECTL

# Step 4: Install Helm
echo "[4/8] Installing Helm..."
ssh $SSH_USER@$VPS_IP << 'HELM'
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
echo "✅ Helm installed"
HELM

# Step 5: Install kustomize
echo "[5/8] Installing kustomize..."
ssh $SSH_USER@$VPS_IP << 'KUSTOMIZE'
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
mv kustomize /usr/local/bin/
echo "✅ kustomize installed"
KUSTOMIZE

# Step 6: Install ArgoCD CLI
echo "[6/8] Installing ArgoCD CLI..."
ssh $SSH_USER@$VPS_IP << 'ARGOCD'
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd
mv argocd /usr/local/bin/argocd
echo "✅ ArgoCD CLI installed"
ARGOCD

# Step 7: Verify installation
echo "[7/8] Verifying installation..."
ssh $SSH_USER@$VPS_IP << 'VERIFY'
echo "--- K3s Version ---"
k3s --version

echo "--- kubectl Version ---"
kubectl version --client

echo "--- Helm Version ---"
helm version

echo "--- Cluster Info ---"
kubectl cluster-info

echo "--- Node Status ---"
kubectl get nodes

echo "✅ All components verified"
VERIFY

# Step 8: Copy kubeconfig locally
echo "[8/8] Copying kubeconfig locally..."
mkdir -p ~/.kube
scp $SSH_USER@$VPS_IP:/etc/rancher/k3s/k3s.yaml ~/.kube/config-digiwise
chmod 600 ~/.kube/config-digiwise

echo ""
echo "=========================================="
echo " K3s Cluster Setup Complete!"
echo "=========================================="
echo ""
echo "Cluster is running at: $VPS_IP"
echo "Kubeconfig saved to: ~/.kube/config-digiwise"
echo ""
echo "Next steps:"
echo "1. Deploy core services: ./scripts/deploy-core-services.sh"
echo "2. Deploy database operators: ./scripts/deploy-database-operators.sh"
echo "3. Deploy monitoring stack: ./scripts/deploy-monitoring.sh"
