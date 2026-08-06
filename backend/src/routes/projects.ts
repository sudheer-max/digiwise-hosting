import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import * as k8s from '../services/kubernetes.js';
import * as argocd from '../services/argocd.js';
import { OwnershipError, recordProjectOwnership, removeProjectOwnership, listOwnedProjectIds, assertProjectOwned } from '../services/ownership.js';
import { assertCanCreateService, PlanError } from '../services/plan.js';

export async function projectRoutes(app: FastifyInstance) {
  // List all projects for the current user
  app.get('/api/projects', {
    schema: {
      tags: ['Projects'],
      description: 'List all projects for the current user',
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request) => {
    const user = request.user as { id: string; role?: string };
    
    const projects = user.role === 'admin'
      ? await prisma.project.findMany({
          include: { user: { select: { id: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        })
      : await prisma.project.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
        });

    const enriched = await Promise.all(projects.map(async (p) => {
      try {
        const [deployments, services] = await Promise.all([
          k8s.listDeployments(p.k8sNamespace),
          k8s.listServices(p.k8sNamespace),
        ]);
        const apps = deployments.map((d: any) => {
          const svc = services.find((s: any) => s.name === d.name);
          return {
            name: d.name,
            status: d.status,
            image: d.image,
            replicas: d.replicas,
            port: svc?.ports?.[0]?.port,
          };
        });
        return { ...p, apps };
      } catch {
        return { ...p, apps: [] };
      }
    }));

    return enriched;
  });

  // Get a specific project
  app.get<{ Params: { id: string } }>('/api/projects/:id', {
    schema: {
      tags: ['Projects'],
      description: 'Get a specific project',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { id } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id }
        : { id, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // Get K8s namespace info
    const namespace = await k8s.getNamespace(project.k8sNamespace);

    return { project, namespace };
  });

  // Create a new project
  app.post<{ Body: { name: string; description?: string } }>('/api/projects', {
    schema: {
      tags: ['Projects'],
      description: 'Create a new project (creates a K8s namespace)',
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 63 },
          description: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    try {
      const user = request.user as { id: string };
      const { name, description } = request.body;

      // Check plan limits
      await assertCanCreateService(user.id);

      // Generate namespace name (lowercase, alphanumeric, hyphens)
      const nsName = `dw-${user.id.slice(-8)}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}`;

      // Create K8s namespace
      const namespace = await k8s.createNamespace(nsName, {
        'digiwise-user-id': user.id,
        'digiwise-project-name': name,
        ...(description && { 'digiwise-description': description }),
      });

      // Create resource quota based on plan
      const userPlan = await prisma.user.findUnique({ where: { id: user.id } });
      const isPro = userPlan?.plan === 'pro';

      await k8s.createResourceQuota(nsName, 'digiwise-quota', {
        cpu: isPro ? '8' : '2',
        memory: isPro ? '16Gi' : '4Gi',
        pods: isPro ? '20' : '5',
      });

      // Create limit range
      await k8s.createLimitRange(nsName, 'digiwise-limits', {
        cpu: '500m',
        memory: '512Mi',
      });

      // Record ownership in database
      const project = await recordProjectOwnership({
        userId: user.id,
        name,
        k8sNamespace: nsName,
      });

      return reply.status(201).send({
        project: {
          id: project.id,
          name: project.name,
          k8sNamespace: project.k8sNamespace,
          createdAt: project.createdAt,
        },
        namespace,
      });
    } catch (err) {
      if (err instanceof PlanError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      if (err instanceof OwnershipError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  // Update a project
  app.put<{ Params: { id: string }; Body: { name?: string; description?: string } }>('/api/projects/:id', {
    schema: {
      tags: ['Projects'],
      description: 'Update a project',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 63 },
          description: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { id } = request.params;
    const { name, description } = request.body;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id }
        : { id, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // Update K8s namespace labels
    const patch = [
      { op: 'replace', path: '/metadata/labels/digiwise-project-name', value: name || project.name },
      ...(description ? [{ op: 'replace', path: '/metadata/labels/digiwise-description', value: description }] : []),
    ];

    try {
      await k8s.k8sCoreApi.patchNamespace({
        name: project.k8sNamespace,
        body: patch,
      });
    } catch {
      // Ignore K8s errors for label updates
    }

    // Update database record
    const updated = await prisma.project.update({
      where: { id },
      data: { name: name || project.name },
    });

    return updated;
  });

  // Delete a project
  app.delete<{ Params: { id: string } }>('/api/projects/:id', {
    schema: {
      tags: ['Projects'],
      description: 'Delete a project (deletes K8s namespace)',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { id } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id }
        : { id, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // Delete K8s namespace (cascades all resources)
    try {
      await k8s.deleteNamespace(project.k8sNamespace);
    } catch {
      // Namespace might not exist
    }

    // Delete ArgoCD application if exists
    try {
      await argocd.deleteApplication(`app-${project.k8sNamespace}`);
    } catch {
      // Application might not exist
    }

    // Remove from database
    await removeProjectOwnership(project.k8sNamespace);

    return { success: true };
  });

  // List deployments in a project
  app.get<{ Params: { id: string } }>('/api/projects/:id/deployments', {
    schema: {
      tags: ['Projects'],
      description: 'List deployments in a project',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { id } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id }
        : { id, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const deployments = await k8s.listDeployments(project.k8sNamespace);
    return deployments;
  });

  // List pods in a project
  app.get<{ Params: { id: string } }>('/api/projects/:id/pods', {
    schema: {
      tags: ['Projects'],
      description: 'List pods in a project',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { id } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id }
        : { id, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const pods = await k8s.listPods(project.k8sNamespace);
    return pods;
  });

  // Get project logs
  app.get<{ Params: { id: string }; Querystring: { pod?: string; lines?: number } }>('/api/projects/:id/logs', {
    schema: {
      tags: ['Projects'],
      description: 'Get logs for a project',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      querystring: {
        type: 'object',
        properties: {
          pod: { type: 'string' },
          lines: { type: 'number', default: 100 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { id } = request.params;
    const { pod, lines = 100 } = request.query;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id }
        : { id, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // Get pods in the namespace
    const pods = await k8s.listPods(project.k8sNamespace);
    if (pods.length === 0) {
      return { logs: 'No pods found' };
    }

    // Use specified pod or first running pod
    const targetPod = pod || pods.find(p => p.phase === 'Running')?.name || pods[0].name;
    const logs = await k8s.getPodLogs(project.k8sNamespace, targetPod, lines);

    return { logs, pod: targetPod };
  });

  // Deploy application via ArgoCD
  app.post<{ Params: { id: string }; Body: { name: string; repoURL: string; path: string; targetRevision?: string } }>('/api/projects/:id/deploy', {
    schema: {
      tags: ['Projects'],
      description: 'Deploy an application via ArgoCD',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['name', 'repoURL', 'path'],
        properties: {
          name: { type: 'string' },
          repoURL: { type: 'string' },
          path: { type: 'string' },
          targetRevision: { type: 'string', default: 'HEAD' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { id } = request.params;
    const { name, repoURL, path, targetRevision } = request.body;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id }
        : { id, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      const app = await argocd.createApplication({
        name: `app-${project.k8sNamespace}-${name}`,
        repoURL,
        path,
        targetRevision,
        destinationNamespace: project.k8sNamespace,
      });

      return app;
    } catch (err) {
      if (err instanceof argocd.ArgoCDError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });
}
