import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import * as k8s from '../services/kubernetes.js';
import { logAudit } from '../services/audit.js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';

export async function uploadRoutes(app: FastifyInstance) {
  app.post<{ Params: { projectId: string } }>('/api/projects/:projectId/apps/upload', {
    schema: {
      tags: ['Applications'],
      description: 'Deploy an application by uploading a ZIP file',
      params: { type: 'object', properties: { projectId: { type: 'string' } } },
      consumes: ['multipart/form-data'],
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

    try {
      const parts = request.parts();
      let appName = '';
      let port = 3000;
      let zipBuffer: Buffer | null = null;

      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          zipBuffer = Buffer.concat(chunks);
        } else if (part.type === 'field') {
          if (part.fieldname === 'name') appName = part.value as string;
          if (part.fieldname === 'port') port = parseInt(part.value as string, 10) || 3000;
        }
      }

      if (!appName.trim()) {
        return reply.status(400).send({ error: 'App name is required' });
      }

      if (!zipBuffer) {
        return reply.status(400).send({ error: 'ZIP file is required' });
      }

      // Extract ZIP to temp directory
      const tmpDir = `/tmp/upload-${Date.now()}`;
      fs.mkdirSync(tmpDir, { recursive: true });

      const zip = await JSZip.loadAsync(zipBuffer);

      // Check if ZIP contains a single root folder
      const rootKeys = Object.keys(zip.files).filter(k => !k.startsWith('.') && k.split('/').length > 1);
      const hasSingleRoot = rootKeys.length > 0 && rootKeys.every(k => k.startsWith(rootKeys[0].split('/')[0] + '/'));

      for (const [filePath, file] of Object.entries(zip.files)) {
        if (file.dir) continue;

        let targetPath = filePath;
        if (hasSingleRoot) {
          // Strip the single root folder
          const parts = filePath.split('/');
          targetPath = parts.slice(1).join('/');
        }

        if (!targetPath) continue;

        const fullPath = path.join(tmpDir, targetPath);
        const dir = path.dirname(fullPath);
        fs.mkdirSync(dir, { recursive: true });

        const content = await file.async('nodebuffer');
        fs.writeFileSync(fullPath, content);
      }

      // Detect framework and generate Dockerfile
      const dockerfile = generateDockerfile(tmpDir);
      fs.writeFileSync(path.join(tmpDir, 'Dockerfile'), dockerfile);

      // Build Docker image
      const imageTag = `digiwise/${appName}:latest`;
      execSync(`docker build -t ${imageTag} ${tmpDir}`, { timeout: 300000, cwd: tmpDir });

      // Import into K3s containerd
      const tarPath = `/tmp/${appName}.tar`;
      execSync(`docker save ${imageTag} -o ${tarPath}`, { timeout: 120000 });
      execSync(`k3s ctr images import ${tarPath}`, { timeout: 120000 });
      execSync(`rm -f ${tarPath}`);

      // Cleanup temp dir
      fs.rmSync(tmpDir, { recursive: true, force: true });

      // Create K8s deployment
      await k8s.createDeployment(
        project.k8sNamespace,
        appName,
        imageTag,
        port,
        {},
        1
      );

      // Create K8s service
      await k8s.createService(
        project.k8sNamespace,
        appName,
        port,
        port
      );

      // Create IngressRoute for external access
      const ingressHost = `${appName}.${project.k8sNamespace}.digiwisesoftech.com`;
      try {
        await k8s.createIngressRoute(
          project.k8sNamespace,
          appName,
          ingressHost,
          port
        );
      } catch { /* ingress creation is optional */ }

      // Audit log
      await logAudit({
        userId: user.id,
        action: 'app.upload',
        resource: 'app',
        resourceId: appName,
        details: { projectId, name: appName, port },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(201).send({
        success: true,
        name: appName,
        port,
        externalUrl: `https://${ingressHost}`,
        message: 'Application deployed from ZIP upload successfully',
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Failed to deploy from upload' });
    }
  });
}

function generateDockerfile(dir: string): string {
  // Check if package.json exists (Node.js)
  if (fs.existsSync(path.join(dir, 'package.json'))) {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'));
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

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
    }

    return `FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
`;
  }

  // Check if requirements.txt exists (Python)
  if (fs.existsSync(path.join(dir, 'requirements.txt'))) {
    return `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 3000
CMD ["python", "app.py"]
`;
  }

  // Check if go.mod exists (Go)
  if (fs.existsSync(path.join(dir, 'go.mod'))) {
    return `FROM golang:1.22 AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o main .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE 3000
CMD ["./main"]
`;
  }

  // Default: static file server
  return `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
}
