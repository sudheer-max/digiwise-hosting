import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import * as k8s from '../services/kubernetes.js';
import { createBuildJob, getBuildStatus, getBuildLogs, listBuilds, deleteBuildJob, cancelBuild } from '../services/build.js';
import { logAudit } from '../services/audit.js';

export async function buildRoutes(app: FastifyInstance) {
  // Trigger a build for an application
  app.post<{
    Params: { projectId: string; appName: string };
    Body: {
      repoURL: string;
      branch?: string;
      buildCommand?: string;
      startCommand?: string;
      port: number;
      env?: Record<string, string>;
    };
  }>('/api/projects/:projectId/apps/:appName/builds', {
    schema: {
      tags: ['Builds'],
      description: 'Trigger a Kaniko build for an application',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          appName: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['repoURL', 'port'],
        properties: {
          repoURL: { type: 'string' },
          branch: { type: 'string', default: 'main' },
          buildCommand: { type: 'string' },
          startCommand: { type: 'string' },
          port: { type: 'number', minimum: 1, maximum: 65535 },
          env: { type: 'object', additionalProperties: { type: 'string' } },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, appName } = request.params;
    const { repoURL, branch = 'main', buildCommand, startCommand, port, env } = request.body;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      const build = await createBuildJob({
        name: appName,
        namespace: project.k8sNamespace,
        repoURL,
        branch,
        buildCommand,
        startCommand,
        port,
        env,
      });

      // Audit log
      await logAudit({
        userId: user.id,
        action: 'build.trigger',
        resource: 'build',
        resourceId: build.name,
        details: { projectId, appName, repoURL, branch, port },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(201).send(build);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Get build status
  app.get<{
    Params: { projectId: string; appName: string; buildId: string };
  }>('/api/projects/:projectId/apps/:appName/builds/:buildId', {
    schema: {
      tags: ['Builds'],
      description: 'Get build status',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          appName: { type: 'string' },
          buildId: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, appName, buildId } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const build = await getBuildStatus(project.k8sNamespace, `${appName}-${buildId}`);
    return build;
  });

  // Get build logs
  app.get<{
    Params: { projectId: string; appName: string; buildId: string };
    Querystring: { tail?: number };
  }>('/api/projects/:projectId/apps/:appName/builds/:buildId/logs', {
    schema: {
      tags: ['Builds'],
      description: 'Get build logs',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          appName: { type: 'string' },
          buildId: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          tail: { type: 'number', default: 500 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, appName, buildId } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const logs = await getBuildLogs(project.k8sNamespace, `${appName}-${buildId}`);
    return { logs };
  });

  // List builds for an application
  app.get<{
    Params: { projectId: string; appName: string };
    Querystring: { limit?: number };
  }>('/api/projects/:projectId/apps/:appName/builds', {
    schema: {
      tags: ['Builds'],
      description: 'List builds for an application',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          appName: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 20 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, appName } = request.params;
    const { limit = 20 } = request.query;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const builds = await listBuilds(project.k8sNamespace, appName);
    return { builds: builds.slice(0, limit) };
  });

  // Cancel a running build
  app.post<{
    Params: { projectId: string; appName: string; buildId: string };
  }>('/api/projects/:projectId/apps/:appName/builds/:buildId/cancel', {
    schema: {
      tags: ['Builds'],
      description: 'Cancel a running build',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          appName: { type: 'string' },
          buildId: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, appName, buildId } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      await cancelBuild(project.k8sNamespace, `${appName}-${buildId}`);

      // Audit log
      await logAudit({
        userId: user.id,
        action: 'build.cancel',
        resource: 'build',
        resourceId: `${appName}-${buildId}`,
        details: { projectId, appName },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Delete a build
  app.delete<{
    Params: { projectId: string; appName: string; buildId: string };
  }>('/api/projects/:projectId/apps/:appName/builds/:buildId', {
    schema: {
      tags: ['Builds'],
      description: 'Delete a build and its resources',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          appName: { type: 'string' },
          buildId: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, appName, buildId } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      await deleteBuildJob(project.k8sNamespace, `${appName}-${buildId}`);
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
