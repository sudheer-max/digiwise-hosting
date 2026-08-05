import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '4000'),
  host: process.env.HOST || '0.0.0.0',
  frontendUrl: process.env.FRONTEND_URL || 'https://digiwisesoftech.com',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  databaseUrl: process.env.DATABASE_URL || '',
  monitor: {
    sshHost: process.env.MONITOR_SSH_HOST,
    sshPort: parseInt(process.env.MONITOR_SSH_PORT || '22'),
    sshUser: process.env.MONITOR_SSH_USER,
    sshKeyPath: process.env.MONITOR_SSH_KEY_PATH,
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
  linode: {
    token: process.env.LINODE_TOKEN || '',
  },
  namecom: {
    username: process.env.NAMECOM_USERNAME || '',
    token: process.env.NAMECOM_TOKEN || '',
  },
  kubernetes: {
    kubeconfig: process.env.KUBECONFIG || '',
    namespace: process.env.K8S_NAMESPACE || 'digiwise-hosting',
  },
  argocd: {
    url: process.env.ARGOCD_URL || 'https://argocd.digiwisesoftech.com',
    token: process.env.ARGOCD_TOKEN || '',
  },
  harbor: {
    url: process.env.HARBOR_URL || 'https://harbor.digiwisesoftech.com',
    project: process.env.HARBOR_PROJECT || 'digiwise',
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'minio.minio.svc.cluster.local',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    secretKey: process.env.MINIO_SECRET_KEY || '',
    useSSL: process.env.MINIO_USE_SSL === 'true',
  },
  database: {
    publicHost: process.env.DB_PUBLIC_HOST || '172.105.49.201',
    publicPortBase: parseInt(process.env.DB_PUBLIC_PORT_BASE || '40000'),
  },
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '25'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@digiwisesoftech.com',
    mock: process.env.SMTP_MOCK === 'true' || process.env.SMTP_HOST === 'mock',
  },
};
