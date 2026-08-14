import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import scalar from '@scalar/fastify-api-reference';

import { config } from './config.js';
import { authenticate, requireAdmin } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { planRoutes } from './routes/plan.js';
import { FastifyInstance } from 'fastify';

// Public payment config endpoint (no auth)
function paymentConfigRoute(app: FastifyInstance, _opts: any, done: () => void) {
  app.get('/api/config/payments', {
    schema: { tags: ['Config'], description: 'Get payment provider config' },
  }, async () => ({
    razorpayKeyId: config.razorpay.keyId || '',
  }));
  done();
}
import { projectRoutes } from './routes/projects.js';
import { appRoutes } from './routes/apps.js';
import { databaseRoutes } from './routes/databases.js';
import { paymentRoutes } from './routes/payment.js';
import { adminRoutes } from './routes/admin.js';
import geoRoutes from './routes/geo.js';
import { domainRoutes } from './routes/domains.js';
import { auditRoutes } from './routes/audit.js';
import { buildRoutes } from './routes/builds.js';
import { uploadRoutes } from './routes/upload.js';
import { emailRoutes } from './routes/email.js';
import { webhookRoutes } from './routes/webhooks.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  // CORS
  await app.register(cors, {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'https://digiwisesoftech.com', 'https://www.digiwisesoftech.com', 'https://api.digiwisesoftech.com'],
    credentials: true,
  });

  // JWT
  await app.register(jwt, { secret: config.jwtSecret });

  // Multipart (file uploads)
  await app.register(multipart, { limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB limit

  // Global error handler
  app.setErrorHandler((error: any, request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      error: error.message || 'Internal Server Error',
      statusCode,
    });
  });

  // Decorate with auth helpers
  app.decorate('authenticate', authenticate);
  app.decorate('requireAdmin', requireAdmin);

  // Swagger / OpenAPI
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'DigiWise Hosting API',
        description: 'Self-hosted PaaS control plane — deploy apps, provision databases, manage domains, monitor infrastructure. Built on K3s + Traefik + ArgoCD + Longhorn.',
        version: '2.1.0',
        contact: { name: 'DigiWise Support', email: 'support@digiwisesoftech.com' },
        license: { name: 'MIT' },
      },
      servers: [
        { url: `http://localhost:${config.port}`, description: 'Development server' },
        { url: 'https://api.digiwisesoftech.com', description: 'Production' },
      ],
      tags: [
        { name: 'Auth', description: 'Authentication & registration' },
        { name: 'Projects', description: 'Kubernetes namespace management' },
        { name: 'Applications', description: 'Kubernetes deployments, services, env vars' },
        { name: 'Builds', description: 'Kaniko build pipeline for Git-push deploys' },
        { name: 'Databases', description: 'CloudNativePG, Percona, MySQL, Redis provisioning' },
        { name: 'Domains', description: 'Custom domain management with TLS via cert-manager' },
        { name: 'Audit Logs', description: 'Platform audit trail' },
        { name: 'Plan', description: 'Subscription plans & usage metering' },
        { name: 'Payment', description: 'Razorpay checkout & billing' },
        { name: 'Admin', description: 'Admin-only platform management' },
        { name: 'Email', description: 'Gmail SMTP integration — send, receive, inbox, sent' },
        { name: 'Config', description: 'Public configuration' },
        { name: 'Geo', description: 'Geolocation detection' },
        { name: 'System', description: 'Health checks' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token from /auth/login or /auth/register',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  // Health check
  app.get('/health', {
    schema: { tags: ['System'], description: 'Health check endpoint' },
  }, async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  app.get('/api/health', {
    schema: { tags: ['System'], description: 'Health check endpoint (API)' },
  }, async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Register routes
  await app.register(paymentConfigRoute);
  await app.register(authRoutes);
  await app.register(paymentRoutes);
  await app.register(planRoutes);
  await app.register(projectRoutes);
  await app.register(appRoutes);
  await app.register(databaseRoutes);
  await app.register(domainRoutes);
  await app.register(auditRoutes);
  await app.register(buildRoutes);
  await app.register(adminRoutes);
  await app.register(geoRoutes);
  await app.register(uploadRoutes);
  await app.register(emailRoutes);
  await app.register(webhookRoutes);

  // Scalar API docs
  await app.register(scalar, {
    routePrefix: '/docs',
    configuration: {
      title: 'DigiWise Hosting API',
      favicon: 'https://raw.githubusercontent.com/scalar/scalar/main/packages/docs/public/favicon.svg',
      spec: { url: '/documentation/json' },
      theme: 'kepler',
      layout: 'modern',
      defaultHttpClient: { targetKey: 'javascript', clientKey: 'fetch' },
    },
  });

  // Swagger UI fallback
  await app.register(import('@fastify/swagger-ui'), {
    routePrefix: '/documentation',
  });

  return app;
}
