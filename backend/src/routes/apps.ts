import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import * as k8s from '../services/kubernetes.js';
import { assertProjectOwned, OwnershipError } from '../services/ownership.js';

export async function appRoutes(app: FastifyInstance) {
  // Create a new application (deployment + service)
  app.post<{ Params: { projectId: string }; Body: { name: string; image: string; port: number; env?: Record<string, string>; replicas?: number } }>('/api/projects/:projectId/apps', {
    schema: {
      tags: ['Applications'],
      description: 'Create a new application in a project',
      params: { type: 'object', properties: { projectId: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['name', 'image', 'port'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 63 },
          image: { type: 'string' },
          port: { type: 'number', minimum: 1, maximum: 65535 },
          env: { type: 'object', additionalProperties: { type: 'string' } },
          replicas: { type: 'number', minimum: 0, maximum: 10, default: 1 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId } = request.params;
    const { name, image, port, env, replicas } = request.body;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      // Create deployment
      const deployment = await k8s.createDeployment(
        project.k8sNamespace,
        name,
        image,
        port,
        env,
        replicas || 1
      );

      // Create service
      const service = await k8s.createService(
        project.k8sNamespace,
        name,
        port,
        port
      );

      return reply.status(201).send({ deployment, service });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // List applications in a project
  app.get<{ Params: { projectId: string } }>('/api/projects/:projectId/apps', {
    schema: {
      tags: ['Applications'],
      description: 'List all applications in a project',
      params: { type: 'object', properties: { projectId: { type: 'string' } } },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const [deployments, services] = await Promise.all([
      k8s.listDeployments(project.k8sNamespace),
      k8s.listServices(project.k8sNamespace),
    ]);

    const apps = deployments.map((d: any) => {
      const svc = services.find((s: any) => s.name === d.name);
      return {
        name: d.name,
        status: d.status,
        image: d.image,
        replicas: d.replicas,
        port: svc?.ports?.[0]?.port,
        namespace: project.k8sNamespace,
        createdAt: d.createdAt,
      };
    });

    return apps;
  });

  // Get a specific application
  app.get<{ Params: { projectId: string; name: string } }>('/api/projects/:projectId/apps/:name', {
    schema: {
      tags: ['Applications'],
      description: 'Get a specific application',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          name: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, name } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const [deployments, services, pods] = await Promise.all([
      k8s.listDeployments(project.k8sNamespace),
      k8s.listServices(project.k8sNamespace),
      k8s.listPods(project.k8sNamespace),
    ]);

    const deployment = deployments.find(d => d.name === name);
    const service = services.find(s => s.name === name);
    const appPods = pods.filter(p => p.name.startsWith(name));

    if (!deployment && !service) {
      return reply.status(404).send({ error: 'Application not found' });
    }

    return {
      name: deployment?.name || service?.name || name,
      status: deployment?.status || 'Unknown',
      image: deployment?.image,
      replicas: deployment?.replicas,
      port: service?.ports?.[0]?.port,
      namespace: project.k8sNamespace,
      createdAt: deployment?.createdAt,
      pods: appPods,
    };
  });

  // Update an application
  app.put<{ Params: { projectId: string; name: string }; Body: { image?: string; env?: Record<string, string>; replicas?: number } }>('/api/projects/:projectId/apps/:name', {
    schema: {
      tags: ['Applications'],
      description: 'Update an application',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          name: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          image: { type: 'string' },
          env: { type: 'object', additionalProperties: { type: 'string' } },
          replicas: { type: 'number', minimum: 0, maximum: 10 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, name } = request.params;
    const { image, env, replicas } = request.body;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      // Delete and recreate deployment with new config
      await k8s.deleteDeployment(project.k8sNamespace, name);

      // Get existing service to preserve port
      const services = await k8s.listServices(project.k8sNamespace);
      const existingService = services.find(s => s.name === name);
      const port = existingService?.ports?.[0]?.port || 3000;

      const deployment = await k8s.createDeployment(
        project.k8sNamespace,
        name,
        image || 'nginx:latest',
        port,
        env,
        replicas || 1
      );

      return deployment;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Delete an application
  app.delete<{ Params: { projectId: string; name: string } }>('/api/projects/:projectId/apps/:name', {
    schema: {
      tags: ['Applications'],
      description: 'Delete an application',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          name: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, name } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      await Promise.all([
        k8s.deleteDeployment(project.k8sNamespace, name),
        k8s.deleteService(project.k8sNamespace, name).catch(() => {}),
      ]);

      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Scale an application
  app.post<{ Params: { projectId: string; name: string }; Body: { replicas: number } }>('/api/projects/:projectId/apps/:name/scale', {
    schema: {
      tags: ['Applications'],
      description: 'Scale an application',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          name: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['replicas'],
        properties: {
          replicas: { type: 'number', minimum: 0, maximum: 10 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, name } = request.params;
    const { replicas } = request.body;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      await k8s.scaleDeployment(project.k8sNamespace, name, replicas);
      return { success: true, replicas };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Get application logs
  app.get<{ Params: { projectId: string; name: string }; Querystring: { lines?: number } }>('/api/projects/:projectId/apps/:name/logs', {
    schema: {
      tags: ['Applications'],
      description: 'Get application logs',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          name: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          lines: { type: 'number', default: 100 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, name } = request.params;
    const { lines = 100 } = request.query;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // Get pods for this app
    const pods = await k8s.listPods(project.k8sNamespace);
    const appPods = pods.filter(p => p.name.startsWith(name));

    if (appPods.length === 0) {
      return { logs: 'No pods found for this application' };
    }

    const logs = await k8s.getPodLogs(project.k8sNamespace, appPods[0].name, lines);
    return { logs, pod: appPods[0].name };
  });

  // Restart an application
  app.post<{ Params: { projectId: string; name: string } }>('/api/projects/:projectId/apps/:name/restart', {
    schema: {
      tags: ['Applications'],
      description: 'Restart an application',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          name: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, name } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      // Scale down to 0, then back to 1
      await k8s.scaleDeployment(project.k8sNamespace, name, 0);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await k8s.scaleDeployment(project.k8sNamespace, name, 1);

      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
