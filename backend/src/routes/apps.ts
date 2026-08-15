import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import { config } from '../config.js';
import * as k8s from '../services/kubernetes.js';
import { assertProjectOwned, OwnershipError } from '../services/ownership.js';
import { logAudit } from '../services/audit.js';
import { createBuildJob, getBuildStatus } from '../services/build.js';

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

      // Audit log
      await logAudit({
        userId: user.id,
        action: 'app.create',
        resource: 'app',
        resourceId: name,
        details: { projectId, name, image, port, replicas: replicas || 1 },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

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

      // Audit log
      await logAudit({
        userId: user.id,
        action: 'app.delete',
        resource: 'app',
        resourceId: name,
        details: { projectId, name },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

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

  // Deploy from GitHub repository
  app.post<{ Params: { projectId: string }; Body: { name: string; repoURL: string; branch?: string; buildCommand?: string; startCommand?: string; port: number; env?: Record<string, string>; githubToken?: string } }>('/api/projects/:projectId/apps/deploy-github', {
    schema: {
      tags: ['Applications'],
      description: 'Deploy an application from a GitHub repository',
      params: { type: 'object', properties: { projectId: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['name', 'repoURL', 'port'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 63 },
          repoURL: { type: 'string' },
          branch: { type: 'string', default: 'main' },
          buildCommand: { type: 'string' },
          startCommand: { type: 'string' },
          port: { type: 'number', minimum: 1, maximum: 65535 },
          env: { type: 'object', additionalProperties: { type: 'string' } },
          githubToken: { type: 'string', description: 'GitHub Personal Access Token for private repos' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId } = request.params;
    const { name, repoURL, branch = 'main', buildCommand, startCommand, port, env, githubToken } = request.body;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // Auto-use stored GitHub token if not provided
    let token = githubToken;
    if (!token) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { githubToken: true } });
      token = dbUser?.githubToken || undefined;
    }

    try {
      // Create Kaniko build job (clones repo via alpine/git, builds via kaniko)
      const build = await createBuildJob({
        name,
        namespace: project.k8sNamespace,
        repoURL,
        branch,
        buildCommand,
        startCommand,
        port,
        env,
        githubToken: token,
      });

      // Save deployment config for webhook auto-deploy immediately
      const crypto = await import('crypto');
      const webhookSecret = crypto.randomBytes(20).toString('hex');

      await prisma.deploymentConfig.upsert({
        where: { projectId_appName: { projectId, appName: name } },
        create: {
          projectId,
          appName: name,
          repoURL,
          branch,
          buildCommand: buildCommand || null,
          startCommand: startCommand || null,
          port,
          webhookSecret,
          webhookId: null,
          autoDeploy: false,
          lastDeployedAt: new Date(),
        },
        update: {
          repoURL,
          branch,
          buildCommand: buildCommand || null,
          startCommand: startCommand || null,
          port,
          lastDeployedAt: new Date(),
        },
      });

      // Return immediately with build info — frontend will poll for completion
      return reply.status(202).send({
        success: true,
        name,
        repoURL,
        branch,
        port,
        buildName: build.name,
        namespace: project.k8sNamespace,
        status: 'building',
        message: 'Build started. Poll /builds/:buildId for status.',
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Failed to deploy from GitHub' });
    }
  });

  // Finalize deployment after build completes (called by frontend after polling build status)
  app.post<{ Params: { projectId: string }; Body: { name: string; buildName: string } }>('/api/projects/:projectId/apps/deploy-finalize', {
    schema: {
      tags: ['Applications'],
      description: 'Finalize deployment after async build completes',
      params: { type: 'object', properties: { projectId: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['name', 'buildName'],
        properties: {
          name: { type: 'string' },
          buildName: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId } = request.params;
    const { name, buildName } = request.body;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      const buildStatus = await getBuildStatus(project.k8sNamespace, buildName);

      if (buildStatus.status === 'failed') {
        return reply.status(500).send({ error: `Build failed: ${buildStatus.message}` });
      }

      if (buildStatus.status !== 'succeeded') {
        return reply.status(400).send({ error: 'Build is not yet complete', status: buildStatus.status });
      }

      const imageTag = buildStatus.imageTag!;
      const { config } = await import('../config.js');
      const port = 3000;

      // Create K8s deployment
      await k8s.createDeployment(project.k8sNamespace, name, imageTag, port, {}, 1);

      // Create K8s service
      await k8s.createService(project.k8sNamespace, name, port, port);

      // Create IngressRoute for external access
      const ingressHost = `${name}.${project.k8sNamespace}.digiwisesoftech.com`;
      try {
        await k8s.createIngressRoute(project.k8sNamespace, name, ingressHost, port);
      } catch { /* ingress creation is optional */ }

      // Audit log
      await logAudit({
        userId: user.id,
        action: 'app.deploy-github',
        resource: 'app',
        resourceId: name,
        details: { projectId, name, buildName, imageTag },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      const webhookUrl = `${config.frontendUrl}/webhooks/github`;

      return reply.status(201).send({
        success: true,
        name,
        imageTag,
        externalUrl: `https://${ingressHost}`,
        webhookUrl,
        message: 'Application deployed successfully.',
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Failed to finalize deployment' });
    }
  });

  // Get application environment variables
  app.get<{ Params: { projectId: string; name: string } }>('/api/projects/:projectId/apps/:name/variables', {
    schema: {
      tags: ['Applications'],
      description: 'Get application environment variables',
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
      // Get deployment to find env vars
      const deployments = await k8s.listDeployments(project.k8sNamespace);
      const deployment = deployments.find(d => d.name === name);

      if (!deployment) {
        return reply.status(404).send({ error: 'Application not found' });
      }

      // Get full deployment details from K8s
      const result = await k8s.k8sAppsApi.readNamespacedDeployment({ name, namespace: project.k8sNamespace });
      const containers = result.spec?.template?.spec?.containers || [];
      const envVars: Record<string, string> = {};

      for (const container of containers) {
        if (container.name === name && container.env) {
          for (const envVar of container.env) {
            if (envVar.name && envVar.value) {
              envVars[envVar.name] = envVar.value;
            }
          }
        }
      }

      return { envVars };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Set/Update environment variables (bulk replace)
  app.put<{ Params: { projectId: string; name: string }; Body: { variables: Record<string, string> } }>('/api/projects/:projectId/apps/:name/variables', {
    schema: {
      tags: ['Applications'],
      description: 'Set environment variables (replaces all env vars on the deployment)',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          name: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['variables'],
        properties: {
          variables: { type: 'object', additionalProperties: { type: 'string' } },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, name } = request.params;
    const { variables } = request.body;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      // Get the existing deployment
      const existing = await k8s.k8sAppsApi.readNamespacedDeployment({ name, namespace: project.k8sNamespace });
      const containers = existing.spec?.template?.spec?.containers || [];
      const targetContainer = containers.find(c => c.name === name);

      if (!targetContainer) {
        return reply.status(404).send({ error: 'Application container not found' });
      }

      // Update env vars on the container
      targetContainer.env = Object.entries(variables).map(([key, value]) => ({
        name: key,
        value,
      }));

      // Patch the deployment to trigger a rolling restart
      const patch = [
        { op: 'replace', path: '/spec/template/spec/containers', value: containers },
      ];

      await k8s.k8sAppsApi.patchNamespacedDeployment({
        name,
        namespace: project.k8sNamespace,
        body: patch,
      });

      // Audit log
      await logAudit({
        userId: user.id,
        action: 'env.update',
        resource: 'app',
        resourceId: name,
        details: { projectId, variables: Object.keys(variables) },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { success: true, variables };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Add/Update a single environment variable
  app.patch<{ Params: { projectId: string; name: string }; Body: { key: string; value: string } }>('/api/projects/:projectId/apps/:name/variables', {
    schema: {
      tags: ['Applications'],
      description: 'Add or update a single environment variable',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          name: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['key', 'value'],
        properties: {
          key: { type: 'string', minLength: 1 },
          value: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, name } = request.params;
    const { key, value } = request.body;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      const existing = await k8s.k8sAppsApi.readNamespacedDeployment({ name, namespace: project.k8sNamespace });
      const containers = existing.spec?.template?.spec?.containers || [];
      const targetContainer = containers.find(c => c.name === name);

      if (!targetContainer) {
        return reply.status(404).send({ error: 'Application container not found' });
      }

      // Add or update the specific env var
      const envVars = targetContainer.env || [];
      const existingIndex = envVars.findIndex(e => e.name === key);

      if (existingIndex >= 0) {
        envVars[existingIndex].value = value;
      } else {
        envVars.push({ name: key, value });
      }

      targetContainer.env = envVars;

      const patch = [
        { op: 'replace', path: '/spec/template/spec/containers', value: containers },
      ];

      await k8s.k8sAppsApi.patchNamespacedDeployment({
        name,
        namespace: project.k8sNamespace,
        body: patch,
      });

      return { success: true, key, value };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Delete an environment variable
  app.delete<{ Params: { projectId: string; name: string; key: string } }>('/api/projects/:projectId/apps/:name/variables/:key', {
    schema: {
      tags: ['Applications'],
      description: 'Delete an environment variable',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          name: { type: 'string' },
          key: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, name, key } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      const existing = await k8s.k8sAppsApi.readNamespacedDeployment({ name, namespace: project.k8sNamespace });
      const containers = existing.spec?.template?.spec?.containers || [];
      const targetContainer = containers.find(c => c.name === name);

      if (!targetContainer) {
        return reply.status(404).send({ error: 'Application container not found' });
      }

      // Remove the specific env var
      const envVars = (targetContainer.env || []).filter(e => e.name !== key);
      targetContainer.env = envVars;

      const patch = [
        { op: 'replace', path: '/spec/template/spec/containers', value: containers },
      ];

      await k8s.k8sAppsApi.patchNamespacedDeployment({
        name,
        namespace: project.k8sNamespace,
        body: patch,
      });

      return { success: true, deleted: key };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
