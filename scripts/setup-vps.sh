#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# DigiWise VPS Setup Script — Ubuntu 22.04 / 24.04
# Installs: Node.js, npm, PM2, Nginx, MongoDB with auth
# ============================================================

ADMIN_EMAIL="${1:-admin@digiwisesoftech.com}"
MONGO_ADMIN_USER="admin"
MONGO_ADMIN_PASS="$(openssl rand -base64 24)"
MONGO_APP_DB="digiwise"
MONGO_APP_USER="app_user"
MONGO_APP_PASS="$(openssl rand -base64 24)"
SERVER_IP="$(curl -4 -s ifconfig.me || hostname -I | awk '{print $1}')"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

echo "============================================"
echo " DigiWise VPS Provisioning Script"
echo " Ubuntu $(lsb_release -rs 2>/dev/null || echo '22.04/24.04')"
echo " IP: $SERVER_IP"
echo "============================================"
echo ""

# --- System updates ---
log "Updating system packages..."
apt update -qq && apt upgrade -y -qq

# --- Install base dependencies ---
log "Installing base dependencies (curl, gnupg, ufw)..."
apt install -y -qq curl gnupg ufw software-properties-common

# ============================================================
# Node.js + npm
# ============================================================
log "Installing Node.js 22 LTS..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
apt install -y -qq nodejs

log "Node.js $(node -v), npm $(npm -v)"

# ============================================================
# PM2
# ============================================================
log "Installing PM2 globally..."
npm install -g pm2 >/dev/null 2>&1
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
log "PM2 $(pm2 -v)"

# ============================================================
# Nginx
# ============================================================
log "Installing Nginx..."
apt install -y -qq nginx
systemctl enable nginx --now >/dev/null 2>&1

# Create frontend directory for static export
mkdir -p /var/www/digiwise-hosting

# Write optimized nginx config for Next.js static export
cat > /etc/nginx/sites-available/default <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/digiwise-hosting;
    index index.html;

    # Handle Next.js trailingSlash: true static export
    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # _next static files with far-future cache
    location /_next/ {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
NGINX

nginx -t >/dev/null 2>&1 && systemctl restart nginx
log "Nginx configured and running (root: /var/www/digiwise-hosting)"

# ============================================================
# MongoDB 8.0
# ============================================================
log "Installing MongoDB 8.0..."

# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
  gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg >/dev/null 2>&1

# Add repo for Ubuntu 24.04 (also works on 22.04 via jammy codename)
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" \
  > /etc/apt/sources.list.d/mongodb-org-8.0.list

apt update -qq >/dev/null 2>&1
apt install -y -qq mongodb-org >/dev/null 2>&1

log "MongoDB $(mongod --version | head -1) installed"

# ============================================================
# MongoDB Security Configuration
# ============================================================
log "Configuring MongoDB authentication..."

# Start MongoDB temporarily without auth
systemctl start mongod
sleep 2

# Create admin user
mongosh admin --quiet --eval "
  db.createUser({
    user: '$MONGO_ADMIN_USER',
    pwd: '$MONGO_ADMIN_PASS',
    roles: [{ role: 'root', db: 'admin' }]
  });
" >/dev/null 2>&1

# Create application database user
mongosh admin --quiet --eval "
  use('$MONGO_APP_DB');
  db.createUser({
    user: '$MONGO_APP_USER',
    pwd: '$MONGO_APP_PASS',
    roles: [{ role: 'readWrite', db: '$MONGO_APP_DB' }]
  });
" >/dev/null 2>&1

# Stop MongoDB to update config
systemctl stop mongod

# Enable authentication + bind to all interfaces
cat > /etc/mongod.conf <<MONGO
# MongoDB config — DigiWise VPS
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
net:
  port: 27017
  bindIp: 0.0.0.0
security:
  authorization: enabled
MONGO

systemctl start mongod
sleep 1
log "MongoDB authentication enabled"

# ============================================================
# Postfix (Transactional Email)
# ============================================================
log "Installing Postfix for transactional email..."
apt install -y -qq postfix mailutils >/dev/null 2>&1

postconf -e "inet_interfaces = localhost"
postconf -e "myhostname = digiwisesoftech.com"
postconf -e "mydomain = digiwisesoftech.com"

systemctl restart postfix >/dev/null 2>&1
log "Postfix configured (localhost:25, outbound only)"

# ============================================================
# Firewall (UFW)
# ============================================================
log "Configuring UFW firewall..."
ufw --force reset >/dev/null 2>&1
ufw default deny incoming >/dev/null 2>&1
ufw default allow outgoing >/dev/null 2>&1
ufw allow ssh >/dev/null 2>&1          # SSH
ufw allow http >/dev/null 2>&1         # HTTP
ufw allow https >/dev/null 2>&1        # HTTPS
ufw allow 27017/tcp >/dev/null 2>&1    # MongoDB
ufw allow 25/tcp >/dev/null 2>&1       # SMTP (Postfix)

ufw --force enable >/dev/null 2>&1
log "UFW firewall enabled (SSH, HTTP, HTTPS, MongoDB 27017, SMTP 25)"

# ============================================================
# Output credentials
# ============================================================
echo ""
echo "============================================"
echo " Setup Complete!"
echo "============================================"
echo ""
echo " MongoDB Admin:"
echo "   Username: $MONGO_ADMIN_USER"
echo "   Password: $MONGO_ADMIN_PASS"
echo "   URI:      mongodb://$MONGO_ADMIN_USER:$MONGO_ADMIN_PASS@$SERVER_IP:27017/admin?authSource=admin"
echo ""
echo " MongoDB App Database ($MONGO_APP_DB):"
echo "   Username: $MONGO_APP_USER"
echo "   Password: $MONGO_APP_PASS"
echo "   URI:      mongodb://$MONGO_APP_USER:$MONGO_APP_PASS@$SERVER_IP:27017/$MONGO_APP_DB?authSource=$MONGO_APP_DB"
echo ""
echo " Connection string (for apps):"
echo "   mongodb://$MONGO_APP_USER:$MONGO_APP_PASS@$SERVER_IP:27017/$MONGO_APP_DB?authSource=$MONGO_APP_DB"
echo ""
echo " Services:"
echo "   Node.js:  $(node -v)"
echo "   npm:      $(npm -v)"
echo "   PM2:      $(pm2 -v)"
echo "   Nginx:    $(nginx -v 2>&1)"
echo "   MongoDB:  $(mongod --version | head -1)"
echo "   Postfix:  $(postconf mail_version 2>/dev/null | cut -d= -f2 | xargs)"
echo ""
echo "============================================"
echo " IMPORTANT: Save these credentials securely!"
echo "============================================"
