import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
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
        description: 'Self-hosted PaaS control plane API - deploy apps, provision databases, manage domains',
        version: '2.0.0',
      },
      servers: [{ url: `http://localhost:${config.port}`, description: 'Development server' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
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
  await app.register(adminRoutes);
  await app.register(geoRoutes);

  // Scalar API docs
  await app.register(scalar, {
    routePrefix: '/docs',
    configuration: {
      title: 'DigiWise Hosting API',
      favicon: 'https://raw.githubusercontent.com/scalar/scalar/main/packages/docs/public/favicon.svg',
    },
  });

  // Swagger UI fallback
  await app.register(import('@fastify/swagger-ui'), {
    routePrefix: '/documentation',
  });

  return app;
}
