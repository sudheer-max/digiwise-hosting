#!/usr/bin/env bash
set -euo pipefail

# --- Database Setup ---
su - postgres -c "psql -c \"CREATE USER digiwise WITH PASSWORD 'DigiWise@2024';\"" 2>/dev/null || true
su - postgres -c "psql -c \"CREATE DATABASE digiwise OWNER digiwise;\"" 2>/dev/null || true
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE digiwise TO digiwise;\"" 2>/dev/null || true

# Allow password auth for local TCP
PG_HBA=$(find /etc/postgresql -name pg_hba.conf 2>/dev/null | head -1)
if [ -n "$PG_HBA" ]; then
  sed -i 's/local\s\+all\s\+all\s\+peer/local   all             all                                     md5/' "$PG_HBA"
  sed -i 's/host\s\+all\s\+all\s\+127.0.0.1\/32\s\+scram-sha-256/host    all             all             127.0.0.1\/32            md5/' "$PG_HBA"
  systemctl restart postgresql
fi

# --- Postfix ---
postconf -e 'inet_interfaces = localhost'
postconf -e 'myhostname = digiwisesoftech.com'
postconf -e 'mydomain = digiwisesoftech.com'
systemctl restart postfix

# --- Nginx Config ---
cat > /etc/nginx/sites-available/default << 'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/digiwise-hosting;
    index index.html;

    location / {
        try_files $uri $uri/ $uri.html =404;
    }

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

    location /_next/ {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
NGINX

nginx -t && systemctl restart nginx

# --- UFW ---
ufw --force reset 2>/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw allow 4000/tcp
ufw allow 25/tcp
ufw --force enable

# --- App Directories ---
mkdir -p /home/digiwise/app/backend
mkdir -p /home/digiwise/app/frontend-dist
chown -R root:root /home/digiwise/app

echo "SERVER_SETUP_COMPLETE"
