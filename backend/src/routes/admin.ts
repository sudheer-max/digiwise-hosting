import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import * as k8s from '../services/kubernetes.js';
import * as argocd from '../services/argocd.js';

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireAdmin);

  app.get('/api/admin/stats', {
    schema: {
      tags: ['Admin'],
      description: 'Get aggregate platform statistics (users + K8s resources)',
    },
  }, async () => {
    const [userCount, namespaces, k8sAvailable, argocdAvailable] = await Promise.all([
      prisma.user.count(),
      k8s.listNamespaces().catch(() => []),
      k8s.isKubernetesAvailable(),
      argocd.isArgoCDAvailable(),
    ]);

    const totalDeployments = namespaces.length; // Simplified - each namespace is a project

    return {
      users: userCount,
      namespaces: namespaces.length,
      deployments: totalDeployments,
      kubernetes: k8sAvailable ? 'connected' : 'disconnected',
      argocd: argocdAvailable ? 'connected' : 'disconnected',
    };
  });

  app.get('/api/admin/users', {
    schema: {
      tags: ['Admin'],
      description: 'List all users (admin only)',
    },
  }, async () => {
    return prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  app.get('/api/admin/projects', {
    schema: {
      tags: ['Admin'],
      description: 'List all projects (admin only)',
    },
  }, async () => {
    return prisma.project.findMany({
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  });

  app.get('/api/admin/health', {
    schema: {
      tags: ['Admin'],
      description: 'Kubernetes infrastructure health (admin only)',
    },
  }, async () => {
    const [k8sAvailable, argocdAvailable] = await Promise.all([
      k8s.isKubernetesAvailable(),
      argocd.isArgoCDAvailable(),
    ]);

    return {
      kubernetes: k8sAvailable ? 'healthy' : 'unavailable',
      argocd: argocdAvailable ? 'healthy' : 'unavailable',
      timestamp: new Date().toISOString(),
    };
  });

  app.get('/api/admin/cluster', {
    schema: {
      tags: ['Admin'],
      description: 'Get Kubernetes cluster info (admin only)',
    },
  }, async () => {
    try {
      const namespaces = await k8s.listNamespaces();
      return {
        namespaces: namespaces.map(ns => ({
          name: ns.name,
          status: ns.status,
          createdAt: ns.createdAt,
        })),
      };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  app.get('/api/admin/cluster/pods', {
    schema: {
      tags: ['Admin'],
      description: 'List all pods across namespaces (admin only)',
    },
  }, async () => {
    const namespaces = await k8s.listNamespaces();
    const allPods = [];

    for (const ns of namespaces) {
      try {
        const pods = await k8s.listPods(ns.name);
        allPods.push(...pods);
      } catch {
        // Skip inaccessible namespaces
      }
    }

    return allPods;
  });
}
