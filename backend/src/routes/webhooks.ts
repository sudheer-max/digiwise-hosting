import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import { config } from '../config.js';
import { verifyWebhookSignature, parseRepoUrl } from '../services/github.js';
import { createBuildJob, getBuildStatus } from '../services/build.js';
import * as k8s from '../services/kubernetes.js';
import { logAudit } from '../services/audit.js';

export async function webhookRoutes(app: FastifyInstance) {
  // GitHub webhook receiver - NO AUTH (verified via HMAC signature)
  app.post('/webhooks/github', {
    schema: {
      tags: ['Webhooks'],
      description: 'GitHub push webhook receiver',
    },
  }, async (request, reply) => {
    const signature = request.headers['x-hub-signature-256'] as string;
    const event = request.headers['x-github-event'] as string;
    const delivery = request.headers['x-github-delivery'] as string;

    // Get raw body for signature verification
    const rawBody = JSON.stringify(request.body);

    // Find matching deployment config
    const body = request.body as any;
    const repoUrl = body?.repository?.clone_url || body?.repository?.ssh_url || '';

    if (!repoUrl) {
      return reply.status(400).send({ error: 'No repository info in payload' });
    }

    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) {
      return reply.status(400).send({ error: 'Could not parse repository URL' });
    }

    // Find deployment configs matching this repo
    const configs = await prisma.deploymentConfig.findMany({
      where: {
        repoURL: { contains: `${parsed.owner}/${parsed.repo}` },
        autoDeploy: true,
        webhookSecret: { not: null },
      },
      include: { project: true },
    });

    if (configs.length === 0) {
      return reply.status(200).send({ message: 'No matching deployment configs' });
    }

    // Verify signature for each config
    let matchedConfig = null;
    for (const cfg of configs) {
      if (cfg.webhookSecret && signature) {
        if (verifyWebhookSignature(rawBody, signature, cfg.webhookSecret)) {
          matchedConfig = cfg;
          break;
        }
      }
    }

    if (!matchedConfig) {
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    // Log the webhook event
    console.log(`[webhook] Received ${event} event for ${parsed.owner}/${parsed.repo} (delivery: ${delivery})`);

    // Only process push events
    if (event !== 'push') {
      return reply.status(200).send({ message: `Ignored event: ${event}` });
    }

    // Check if push is to the configured branch
    const branch = body?.ref?.replace('refs/heads/', '');
    if (branch !== matchedConfig.branch) {
      return reply.status(200).send({ message: `Ignored push to branch: ${branch}` });
    }

    const commitSha = body?.after;
    const commitMsg = body?.head_commit?.message || '';
    const commitAuthor = body?.pusher?.name || body?.head_commit?.author?.name || '';

    console.log(`[webhook] Auto-deploy triggered: ${matchedConfig.appName} @ ${commitSha?.slice(0, 7)}`);

    try {
      // Create build job
      const build = await createBuildJob({
        name: matchedConfig.appName,
        namespace: matchedConfig.project.k8sNamespace,
        repoURL: matchedConfig.repoURL,
        branch: matchedConfig.branch,
        buildCommand: matchedConfig.buildCommand || undefined,
        startCommand: matchedConfig.startCommand || undefined,
        port: matchedConfig.port,
      });

      // Update deployment config with latest commit info
      await prisma.deploymentConfig.update({
        where: { id: matchedConfig.id },
        data: {
          lastDeployedAt: new Date(),
          lastCommitSha: commitSha,
          lastCommitMsg: commitMsg,
        },
      });

      // Poll for build completion (max 10 minutes)
      const buildTimeout = 600000;
      const pollInterval = 5000;
      const startTime = Date.now();
      let finalStatus = build;

      while (Date.now() - startTime < buildTimeout) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        finalStatus = await getBuildStatus(matchedConfig.project.k8sNamespace, build.name);

        if (finalStatus.status === 'succeeded' || finalStatus.status === 'failed') {
          break;
        }
      }

      if (finalStatus.status === 'succeeded' && build.imageTag) {
        // Create/Update K8s deployment
        try {
          await k8s.createDeployment(
            matchedConfig.project.k8sNamespace,
            matchedConfig.appName,
            build.imageTag,
            matchedConfig.port,
            {},
            1
          );
        } catch {
          // Deployment might already exist, try to update
        }

        // Create/Update K8s service
        try {
          await k8s.createService(
            matchedConfig.project.k8sNamespace,
            matchedConfig.appName,
            matchedConfig.port,
            matchedConfig.port
          );
        } catch {
          // Service might already exist
        }

        // Audit log
        await logAudit({
          userId: matchedConfig.project.userId,
          action: 'app.auto-deploy',
          resource: 'app',
          resourceId: matchedConfig.appName,
          details: {
            projectId: matchedConfig.projectId,
            appName: matchedConfig.appName,
            repoURL: matchedConfig.repoURL,
            branch: matchedConfig.branch,
            commitSha,
            commitMsg,
            commitAuthor,
            buildName: build.name,
          },
        });

        console.log(`[webhook] Auto-deploy succeeded: ${matchedConfig.appName}`);
      } else {
        console.log(`[webhook] Auto-deploy failed: ${matchedConfig.appName} - ${finalStatus.message}`);
      }

      return reply.status(200).send({
        message: 'Webhook processed',
        appName: matchedConfig.appName,
        buildName: build.name,
        buildStatus: finalStatus.status,
      });
    } catch (err: any) {
      console.error(`[webhook] Auto-deploy error: ${err.message}`);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Setup webhook for a deployment (authenticated)
  app.post<{
    Params: { projectId: string; appName: string };
    Body: { autoDeploy: boolean };
  }>('/api/projects/:projectId/apps/:appName/webhook', {
    schema: {
      tags: ['Webhooks'],
      description: 'Setup or update GitHub webhook for auto-deploy',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          appName: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['autoDeploy'],
        properties: {
          autoDeploy: { type: 'boolean' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, appName } = request.params;
    const { autoDeploy } = request.body;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const config_record = await prisma.deploymentConfig.findFirst({
      where: { projectId, appName },
    });

    if (!config_record) {
      return reply.status(404).send({ error: 'Deployment config not found. Deploy from GitHub first.' });
    }

    // Generate webhook URL
    const webhookUrl = `${config.frontendUrl}/webhooks/github`;

    if (autoDeploy && !config_record.webhookSecret) {
      // Generate new webhook secret
      const crypto = await import('crypto');
      const secret = crypto.randomBytes(20).toString('hex');

      await prisma.deploymentConfig.update({
        where: { id: config_record.id },
        data: { webhookSecret: secret, autoDeploy: true },
      });

      config_record.webhookSecret = secret;
    }

    // Update auto-deploy setting
    await prisma.deploymentConfig.update({
      where: { id: config_record.id },
      data: { autoDeploy },
    });

    // Audit log
    await logAudit({
      userId: user.id,
      action: autoDeploy ? 'app.webhook-enabled' : 'app.webhook-disabled',
      resource: 'app',
      resourceId: appName,
      details: { projectId, appName, autoDeploy },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return {
      success: true,
      autoDeploy,
      webhookUrl,
      webhookSecret: config_record.webhookSecret,
      instructions: autoDeploy
        ? `Add this webhook URL to your GitHub repo: ${webhookUrl} with secret: ${config_record.webhookSecret}`
        : 'Auto-deploy disabled',
    };
  });

  // Get webhook status
  app.get<{
    Params: { projectId: string; appName: string };
  }>('/api/projects/:projectId/apps/:appName/webhook', {
    schema: {
      tags: ['Webhooks'],
      description: 'Get webhook status for a deployment',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          appName: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, appName } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const config_record = await prisma.deploymentConfig.findFirst({
      where: { projectId, appName },
    });

    if (!config_record) {
      return reply.status(404).send({ error: 'Deployment config not found' });
    }

    return {
      autoDeploy: config_record.autoDeploy,
      webhookUrl: config_record.webhookSecret ? `${config.frontendUrl}/webhooks/github` : null,
      lastDeployedAt: config_record.lastDeployedAt,
      lastCommitSha: config_record.lastCommitSha,
      lastCommitMsg: config_record.lastCommitMsg,
      repoURL: config_record.repoURL,
      branch: config_record.branch,
    };
  });
}
