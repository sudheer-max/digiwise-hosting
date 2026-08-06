#!/bin/bash

# DigiWise Hosting Deployment Script
# This script deploys the frontend and backend on a remote server

set -e

# Configuration
SERVER_IP="172.105.49.201"
SERVER_USER="root"
DEPLOY_DIR="/root/digiwise-hosting"

echo "=========================================="
echo "DigiWise Hosting Deployment"
echo "=========================================="
echo ""

# Check if SSH connection works
echo "Testing SSH connection..."
ssh -o ConnectTimeout=10 ${SERVER_USER}@${SERVER_IP} "echo 'SSH connection successful'" || {
    echo "ERROR: Cannot connect to server via SSH"
    exit 1
}

echo ""
echo "Step 1: Installing Docker and Docker Compose on server..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
    # Update system
    apt-get update -y
    
    # Install Docker if not installed
    if ! command -v docker &> /dev/null; then
        echo "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
        systemctl enable docker
        systemctl start docker
    else
        echo "Docker already installed"
    fi
    
    # Install Docker Compose if not installed
    if ! command -v docker-compose &> /dev/null; then
        echo "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    else
        echo "Docker Compose already installed"
    fi
    
    # Verify installations
    docker --version
    docker-compose --version
EOF

echo ""
echo "Step 2: Creating deployment directory..."
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${DEPLOY_DIR}"

echo ""
echo "Step 3: Copying project files to server..."
# Copy all necessary files
scp -r docker-compose.yml ${SERVER_USER}@${SERVER_IP}:${DEPLOY_DIR}/
scp -r nginx/ ${SERVER_USER}@${SERVER_IP}:${DEPLOY_DIR}/
scp -r backend/ ${SERVER_USER}@${SERVER_IP}:${DEPLOY_DIR}/
scp -r frontend/ ${SERVER_USER}@${SERVER_IP}:${DEPLOY_DIR}/

echo ""
echo "Step 4: Setting up environment files on server..."
ssh ${SERVER_USER}@${SERVER_IP} << EOF
    cd ${DEPLOY_DIR}
    
    # Create backend .env.docker if it doesn't exist
    if [ ! -f backend/.env.docker ]; then
        cat > backend/.env.docker << 'ENVEOF'
PORT=4000
HOST=0.0.0.0
FRONTEND_URL=http://${SERVER_IP}
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
ENVEOF
    fi
EOF

echo ""
echo "Step 5: Building and starting containers..."
ssh ${SERVER_USER}@${SERVER_IP} << EOF
    cd ${DEPLOY_DIR}
    
    # Stop existing containers
    docker-compose down
    
    # Build and start
    docker-compose up -d --build
    
    # Wait for services to start
    echo "Waiting for services to start..."
    sleep 30
    
    # Check status
    docker-compose ps
EOF

echo ""
echo "Step 6: Running database migrations..."
ssh ${SERVER_USER}@${SERVER_IP} << EOF
    cd ${DEPLOY_DIR}
    
    # Run Prisma migrations
    docker-compose exec -T backend npx prisma db push --accept-data-loss
EOF

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Frontend: http://${SERVER_IP}"
echo "Backend API: http://${SERVER_IP}/api/"
echo "API Docs: http://${SERVER_IP}/docs"
echo ""
echo "To check logs:"
echo "  ssh ${SERVER_USER}@${SERVER_IP}"
echo "  cd ${DEPLOY_DIR}"
echo "  docker-compose logs -f"
echo ""
echo "To restart services:"
echo "  docker-compose restart"
echo ""
echo "To stop services:"
echo "  docker-compose down"
