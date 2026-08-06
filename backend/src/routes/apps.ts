import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import * as k8s from '../services/kubernetes.js';
import { assertProjectOwned, OwnershipError } from '../services/ownership.js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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

  // Deploy from GitHub repository
  app.post<{ Params: { projectId: string }; Body: { name: string; repoURL: string; branch?: string; buildCommand?: string; startCommand?: string; port: number; env?: Record<string, string> } }>('/api/projects/:projectId/apps/deploy-github', {
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
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId } = request.params;
    const { name, repoURL, branch = 'main', buildCommand, startCommand, port, env } = request.body;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      // Clone the repo to a temp directory
      const tmpDir = `/tmp/build-${Date.now()}`;
      execSync(`git clone --depth 1 -b ${branch} ${repoURL} ${tmpDir}`, { timeout: 60000 });

      // Build Docker image
      const dockerfile = generateDockerfile(tmpDir, buildCommand, startCommand);
      fs.writeFileSync(path.join(tmpDir, 'Dockerfile'), dockerfile);

      const imageTag = `digiwise/${name}:latest`;
      execSync(`docker build -t ${imageTag} ${tmpDir}`, { timeout: 300000, cwd: tmpDir });

      // Import into K3s containerd
      const tarPath = `/tmp/${name}.tar`;
      execSync(`docker save ${imageTag} -o ${tarPath}`, { timeout: 120000 });
      execSync(`k3s ctr images import ${tarPath}`, { timeout: 120000 });
      execSync(`rm -f ${tarPath}`);

      // Cleanup temp dir
      execSync(`rm -rf ${tmpDir}`);

      // Create K8s deployment
      await k8s.createDeployment(
        project.k8sNamespace,
        name,
        imageTag,
        port,
        env,
        1
      );

      // Create K8s service
      await k8s.createService(
        project.k8sNamespace,
        name,
        port,
        port
      );

      // Create IngressRoute for external access
      const ingressHost = `${name}.${project.k8sNamespace}.digiwisesoftech.com`;
      try {
        await k8s.createIngressRoute(
          project.k8sNamespace,
          name,
          ingressHost,
          port
        );
      } catch { /* ingress creation is optional */ }

      return reply.status(201).send({
        success: true,
        name,
        repoURL,
        branch,
        port,
        externalUrl: `https://${ingressHost}`,
        message: 'Application deployed from GitHub successfully',
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Failed to deploy from GitHub' });
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
}

// Generate a basic Dockerfile for common Node.js/Python apps
function generateDockerfile(repoDir: string, buildCommand?: string, startCommand?: string): string {
  // Check if package.json exists (Node.js)
  if (fs.existsSync(path.join(repoDir, 'package.json'))) {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf-8'));
    const isNext = !!pkg.dependencies?.next;
    const isVite = !!pkg.dependencies?.vite;

    if (isNext) {
      return `FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
`;
    }

    if (isVite) {
      return `FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
`;
    }

    return `FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
${buildCommand ? `RUN ${buildCommand}` : ''}
EXPOSE 3000
CMD ${startCommand ? `["sh", "-c", "${startCommand}"]` : '["node", "index.js"]'}
`;
  }

  // Check if requirements.txt exists (Python)
  if (fs.existsSync(path.join(repoDir, 'requirements.txt'))) {
    return `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
${buildCommand ? `RUN ${buildCommand}` : ''}
EXPOSE 3000
CMD ${startCommand ? `["sh", "-c", "${startCommand}"]` : '["python", "app.py"]'}
`;
  }

  // Check if go.mod exists (Go)
  if (fs.existsSync(path.join(repoDir, 'go.mod'))) {
    return `FROM golang:1.22 AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
${buildCommand ? `RUN ${buildCommand}` : 'RUN CGO_ENABLED=0 go build -o main .'}
RUN go build -o main .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE 3000
CMD ["./main"]
`;
  }

  // Default: static file server
  return `FROM node:22-slim
WORKDIR /app
COPY . .
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", ".", "-l", "3000"]
`;
}
