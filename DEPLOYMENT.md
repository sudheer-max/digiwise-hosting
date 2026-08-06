# DigiWise Hosting Deployment Guide

## Prerequisites
- SSH access to server: `root@172.105.49.201`
- Password: `Sudheer@9699`

## Step 1: Connect to Server

```bash
ssh root@172.105.49.201
# Enter password: Sudheer@9699
```

## Step 2: Create Deployment Directory

```bash
mkdir -p /root/digiwise-hosting
cd /root/digiwise-hosting
```

## Step 3: Upload Project Files

From your local machine (in the project directory):

```bash
# Option A: Using SCP (run from local machine)
scp -r docker-compose.yml root@172.105.49.201:/root/digiwise-hosting/
scp -r nginx/ root@172.105.49.201:/root/digiwise-hosting/
scp -r backend/ root@172.105.49.201:/root/digiwise-hosting/
scp -r frontend/ root@172.105.49.201:/root/digiwise-hosting/
scp deploy-server.sh root@172.105.49.201:/root/digiwise-hosting/

# Option B: Using Git (if repository is available)
cd /root/digiwise-hosting
git clone <your-repo-url> .
```

## Step 4: Run Deployment Script

On the server:

```bash
cd /root/digiwise-hosting
chmod +x deploy-server.sh
bash deploy-server.sh
```

## Step 5: Verify Deployment

```bash
# Check container status
docker compose ps

# Check backend logs
docker compose logs backend

# Check frontend logs
docker compose logs frontend

# Check nginx logs
docker compose logs nginx

# Test API
curl http://localhost/api/health

# Test Frontend
curl http://localhost/
```

## Service URLs

- **Frontend**: http://172.105.49.201
- **Backend API**: http://172.105.49.201/api/
- **API Docs**: http://172.105.49.201/docs

## Useful Commands

```bash
# View all logs
docker compose logs -f

# Restart all services
docker compose restart

# Stop all services
docker compose down

# Rebuild and restart
docker compose up -d --build

# Enter backend container
docker compose exec backend sh

# Enter PostgreSQL container
docker compose exec postgresql psql -U digiwise-db -d digiwise

# Run Prisma Studio (database GUI)
docker compose exec backend npx prisma studio
```

## Troubleshooting

### If containers fail to start:
```bash
docker compose logs
docker compose ps
```

### If database connection fails:
```bash
docker compose exec postgresql pg_isready -U digiwise-db -d digiwise
```

### If frontend shows blank page:
```bash
docker compose exec frontend ls -la /usr/share/nginx/html/dist/
```

### To completely reset:
```bash
docker compose down -v  # Removes volumes too
docker compose up -d --build
```
