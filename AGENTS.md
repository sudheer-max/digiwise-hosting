# DigiWise Hosting - Build Instructions

## Architecture (v2.0 - Kubernetes)
- **Orchestration:** K3s (lightweight Kubernetes)
- **Ingress:** Traefik (auto TLS via cert-manager)
- **Storage:** Longhorn (persistent volumes)
- **Registry:** Harbor (private Docker images)
- **Object Storage:** MinIO (S3-compatible)
- **GitOps:** ArgoCD (continuous deployment)
- **Databases:** CloudNativePG (PostgreSQL), Percona (MongoDB), Spotahome (Redis)
- **Monitoring:** Prometheus + Grafana + Loki
- **Domain:** digiwisesoftech.com (Cloudflare)

## VPS (Production)
- **IP:** 172.105.49.201 (ap-west / Mumbai)
- **Domain:** digiwisesoftech.com
- **K3s:** Single-node cluster with all services
- **PostgreSQL:** CloudNativePG operator
- **MongoDB:** Percona operator
- **Redis:** Spotahome operator
- Run `scripts/setup-k3s.sh` on the VPS to provision K3s

## Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push   # Requires PostgreSQL running
npm run dev           # Starts API on http://localhost:4000
```

## Frontend
```bash
cd frontend
npm install
npm run dev           # Starts dev server on http://localhost:3000
```

## API Docs
- Scalar: http://localhost:4000/docs
- Swagger UI: http://localhost:4000/documentation

## Creating Admin User
Run this SQL against your PostgreSQL database:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

## Connecting Frontend to Backend
Set `VITE_API_URL` in `frontend/.env` to point to your backend URL.

## Kubernetes Cluster Setup
```bash
# Setup K3s on existing VPS
./scripts/setup-k3s.sh

# Deploy core services (Traefik, Longhorn, ArgoCD, Harbor, MinIO)
./scripts/deploy-core-services.sh

# Deploy database operators (PostgreSQL, MongoDB, Redis)
./scripts/deploy-database-operators.sh

# Deploy monitoring stack (Prometheus, Grafana, Loki)
./scripts/deploy-monitoring.sh

# Deploy backend
./scripts/deploy-backend.sh

# Deploy frontend
./scripts/deploy-frontend.sh
```

## Cloudflare
- **DNS:** digiwisesoftech.com → K3s cluster IP
- **Tunnel:** Optional for development
- **SSL:** Managed by cert-manager + Let's Encrypt

## API Endpoints

### Authentication
- `POST /auth/login` — Login with email/password
- `POST /auth/register` — Register new user
- `POST /auth/github` — GitHub OAuth
- `GET /auth/me` — Get current user

### Projects (Kubernetes Namespaces)
- `GET /api/projects` — List user's projects
- `POST /api/projects` — Create project (K8s namespace)
- `GET /api/projects/:id` — Get project details
- `PUT /api/projects/:id` — Update project
- `DELETE /api/projects/:id` — Delete project (deletes K8s namespace)
- `GET /api/projects/:id/deployments` — List deployments
- `GET /api/projects/:id/pods` — List pods
- `GET /api/projects/:id/logs` — Get logs
- `POST /api/projects/:id/deploy` — Deploy via ArgoCD

### Applications (Kubernetes Deployments)
- `GET /api/projects/:projectId/apps` — List apps
- `POST /api/projects/:projectId/apps` — Create app (Deployment + Service)
- `GET /api/projects/:projectId/apps/:name` — Get app details
- `PUT /api/projects/:projectId/apps/:name` — Update app
- `DELETE /api/projects/:projectId/apps/:name` — Delete app
- `POST /api/projects/:projectId/apps/:name/scale` — Scale app
- `GET /api/projects/:projectId/apps/:name/logs` — Get app logs
- `POST /api/projects/:projectId/apps/:name/restart` — Restart app

### Databases
- `GET /api/databases` — List database operators
- `POST /api/databases` — Create database instance
- `GET /api/databases/:namespace` — List databases in namespace
- `DELETE /api/databases/:namespace/:type/:name` — Delete database

### Admin
- `GET /admin/stats` — Platform statistics
- `GET /admin/users` — List all users
- `GET /admin/projects` — List all projects
- `GET /admin/health` — Infrastructure health
- `GET /admin/cluster` — Kubernetes cluster info
- `GET /admin/cluster/pods` — List all pods

### Plan & Billing
- `GET /plan` — Get user's plan
- `POST /plan/checkout` — Checkout with Razorpay
- `POST /plan/activate-payg` — Activate pay-as-you-go

### Payment
- `GET /config/payments` — Get payment config
- `POST /checkout/send-confirmation` — Send confirmation email

### System
- `GET /health` — Health check
- `GET /geo/country` — Get country from Cloudflare

## Kubernetes Resources

### Namespaces
Each project gets its own namespace with:
- Resource quotas (CPU, memory, pods)
- Limit ranges (default resource limits)
- Network policies (optional)

### Deployments
Applications are deployed as Kubernetes Deployments with:
- Rolling updates
- Health checks (liveness, readiness)
- Resource limits
- Environment variables

### Services
Each deployment gets a ClusterIP Service for internal access.

### Ingress
Traefik handles ingress with:
- Automatic TLS certificates
- Rate limiting
- CORS configuration

### Databases
Managed via Kubernetes operators:
- **PostgreSQL:** CloudNativePG
- **MongoDB:** Percona
- **Redis:** Spotahome

## Development

### Local Development
```bash
# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev
```

### Building for Production
```bash
# Build backend
cd backend && npm run build

# Build frontend
cd frontend && npm run build
```

### Docker Build
```bash
# Backend
cd backend && docker build -t digiwise-backend .

# Frontend
cd frontend && docker build -t digiwise-frontend .
```

## Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/digiwise

# JWT
JWT_SECRET=your-secret-key

# Kubernetes
KUBECONFIG=/path/to/kubeconfig
K8S_NAMESPACE=digiwise-hosting

# ArgoCD
ARGOCD_URL=https://argocd.digiwisesoftech.com
ARGOCD_TOKEN=your-argocd-token

# Harbor
HARBOR_URL=harbor.digiwisesoftech.com
HARBOR_PROJECT=digiwise

# MinIO
MINIO_ENDPOINT=minio.minio.svc.cluster.local
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key

# Razorpay
RAZORPAY_KEY_ID=your-key
RAZORPAY_KEY_SECRET=your-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# SMTP
SMTP_HOST=localhost
SMTP_PORT=25
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:4000
```

## Troubleshooting

### K3s Issues
```bash
# Check K3s status
sudo systemctl status k3s

# Check nodes
kubectl get nodes

# Check pods
kubectl get pods -A
```

### Backend Issues
```bash
# Check logs
kubectl logs -f deployment/digiwise-api -n digiwise-backend

# Check connectivity
kubectl exec -it deployment/digiwise-api -n digiwise-backend -- curl localhost:4000/health
```

### Database Issues
```bash
# Check PostgreSQL
kubectl get pods -n postgresql

# Check MongoDB
kubectl get pods -n mongodb

# Check Redis
kubectl get pods -n redis
```
