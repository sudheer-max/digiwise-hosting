#!/bin/bash

# DigiWise Hosting - Complete Deployment Script
# Run this script on the server after uploading the project files
# Usage: bash deploy-server.sh

set -e

DEPLOY_DIR="/root/digiwise-hosting"

echo "=========================================="
echo "DigiWise Hosting Deployment"
echo "=========================================="
echo ""

# Navigate to deployment directory
cd $DEPLOY_DIR

echo "Step 1: Installing Docker and Docker Compose..."
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "Docker installed successfully"
else
    echo "Docker already installed"
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose plugin..."
    apt-get install -y docker-compose-plugin
    echo "Docker Compose installed successfully"
else
    echo "Docker Compose already installed"
fi

echo ""
echo "Step 2: Setting up environment files..."
if [ ! -f backend/.env.docker ]; then
    cat > backend/.env.docker << 'EOF'
PORT=4000
HOST=0.0.0.0
FRONTEND_URL=http://172.105.49.201
JWT_SECRET=d1g1w153-h0st1ng-pr0duct10n-jwt-s3cr3t-k3y-2024
DATABASE_URL=postgresql://digiwise-db:digiwise-password@postgresql:5432/digiwise

RAZORPAY_KEY_ID=rzp_live_STpbKd6idgggQN
RAZORPAY_KEY_SECRET=A5PNkoBoit0eMDujrohmKnd1

GITHUB_CLIENT_ID=Ov23lid01QB4WsOyVNjH
GITHUB_CLIENT_SECRET=acdb64f00958286890b988cab0f6b461a226491f

ADMIN_EMAIL=admin@digiwisesoftech.com
ADMIN_PASSWORD=admin123

LINODE_TOKEN=5b5136e634efc8d7e76adc797e319d01935e417b3e24ca67e7d5224e593c21be

NAMECOM_USERNAME=suddymax0001
NAMECOM_TOKEN=1e5a485116af37ec1e13b03eb92b80c3fe1b9ffe

SMTP_HOST=localhost
SMTP_PORT=25
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@digiwisesoftech.com
SMTP_MOCK=true

NODE_ENV=production
EOF
    echo "Created backend/.env.docker"
fi

echo ""
echo "Step 3: Stopping existing containers..."
docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true

echo ""
echo "Step 4: Building and starting containers..."
docker compose up -d --build 2>/dev/null || docker-compose up -d --build

echo ""
echo "Step 5: Waiting for services to start..."
sleep 30

echo ""
echo "Step 6: Running database migrations..."
docker compose exec -T backend npx prisma db push --accept-data-loss 2>/dev/null || \
docker-compose exec -T backend npx prisma db push --accept-data-loss || true

echo ""
echo "Step 7: Checking service status..."
docker compose ps 2>/dev/null || docker-compose ps

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Frontend: http://172.105.49.201"
echo "Backend API: http://172.105.49.201/api/"
echo "API Docs: http://172.105.49.201/docs"
echo ""
echo "To check logs:"
echo "  cd $DEPLOY_DIR"
echo "  docker compose logs -f"
echo ""
echo "To restart services:"
echo "  docker compose restart"
echo ""
echo "To stop services:"
echo "  docker compose down"
