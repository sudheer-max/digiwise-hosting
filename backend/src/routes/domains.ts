import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import * as k8s from '../services/kubernetes.js';
import * as dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);
const resolve4 = promisify(dns.resolve4);

export async function domainRoutes(app: FastifyInstance) {
  // List domains for a service
  app.get<{ Params: { projectId: string; appName: string } }>('/api/projects/:projectId/apps/:appName/domains', {
    schema: {
      tags: ['Domains'],
      description: 'List custom domains for an application',
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

    try {
      // Get domains from IngressRoute labels
      const ingressRoutes = await k8s.k8sCustomApi.listNamespacedCustomObject({
        group: 'traefik.io',
        version: 'v1alpha1',
        namespace: project.k8sNamespace,
        plural: 'ingressroutes',
      });

      const items = (ingressRoutes as any).items || [];
      const domains = items
        .filter((ir: any) => ir.metadata?.labels?.app === appName && ir.metadata?.labels?.domain)
        .map((ir: any) => ({
          domain: ir.metadata.labels.domain,
          status: ir.metadata.labels['domain-status'] || 'pending',
          sslStatus: ir.metadata.labels['ssl-status'] || 'provisioning',
          createdAt: ir.metadata.creationTimestamp,
        }));

      return { domains };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Add a custom domain
  app.post<{ Params: { projectId: string; appName: string }; Body: { domain: string; port?: number } }>('/api/projects/:projectId/apps/:appName/domains', {
    schema: {
      tags: ['Domains'],
      description: 'Add a custom domain to an application',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          appName: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['domain'],
        properties: {
          domain: { type: 'string', description: 'Custom domain (e.g., app.example.com)' },
          port: { type: 'number', description: 'Target port (defaults to service port)' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, appName } = request.params;
    const { domain, port } = request.body;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // Validate domain format
    if (!domain || !/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(domain)) {
      return reply.status(400).send({ error: 'Invalid domain format' });
    }

    try {
      // Get the service port
      const services = await k8s.listServices(project.k8sNamespace);
      const service = services.find(s => s.name === appName);

      if (!service) {
        return reply.status(404).send({ error: 'Application service not found' });
      }

      const servicePort = port || service.ports[0]?.port || 3000;

      // Generate verification token
      const verificationToken = `digiwise-verify-${Buffer.from(`${project.id}-${appName}-${domain}`).toString('base64').slice(0, 32)}`;

      // Create or update IngressRoute for the domain
      const ingressRoute = {
        apiVersion: 'traefik.io/v1alpha1',
        kind: 'IngressRoute',
        metadata: {
          name: `${appName}-domain-${domain.replace(/\./g, '-')}`,
          namespace: project.k8sNamespace,
          labels: {
            app: appName,
            domain: domain,
            'domain-status': 'pending',
            'ssl-status': 'provisioning',
            'managed-by': 'digiwise-hosting',
            'verification-token': verificationToken,
          },
        },
        spec: {
          entryPoints: ['websecure'],
          routes: [
            {
              match: `Host(\`${domain}\`)`,
              kind: 'Rule',
              services: [
                {
                  name: appName,
                  port: servicePort,
                },
              ],
            },
          ],
          tls: {
            secretName: `${appName}-tls-${domain.replace(/\./g, '-')}`,
          },
        },
      };

      try {
        await k8s.k8sCustomApi.createNamespacedCustomObject({
          group: 'traefik.io',
          version: 'v1alpha1',
          namespace: project.k8sNamespace,
          plural: 'ingressroutes',
          body: ingressRoute,
        });
      } catch (err: any) {
        if (err?.body?.reason === 'AlreadyExists') {
          await k8s.k8sCustomApi.replaceNamespacedCustomObject({
            group: 'traefik.io',
            version: 'v1alpha1',
            namespace: project.k8sNamespace,
            plural: 'ingressroutes',
            name: `${appName}-domain-${domain.replace(/\./g, '-')}`,
            body: ingressRoute,
          });
        } else {
          throw err;
        }
      }

      // Create cert-manager Certificate resource
      const certificate = {
        apiVersion: 'cert-manager.io/v1',
        kind: 'Certificate',
        metadata: {
          name: `${appName}-cert-${domain.replace(/\./g, '-')}`,
          namespace: project.k8sNamespace,
          labels: {
            app: appName,
            domain: domain,
            'managed-by': 'digiwise-hosting',
          },
        },
        spec: {
          secretName: `${appName}-tls-${domain.replace(/\./g, '-')}`,
          issuerRef: {
            name: 'letsencrypt-prod',
            kind: 'ClusterIssuer',
          },
          dnsNames: [domain],
        },
      };

      try {
        await k8s.k8sCustomApi.createNamespacedCustomObject({
          group: 'cert-manager.io',
          version: 'v1',
          namespace: project.k8sNamespace,
          plural: 'certificates',
          body: certificate,
        });
      } catch (err: any) {
        // Certificate might already exist, ignore
        if (err?.body?.reason !== 'AlreadyExists') {
          console.warn('Failed to create certificate:', err.message);
        }
      }

      return reply.status(201).send({
        domain,
        status: 'pending',
        sslStatus: 'provisioning',
        verificationToken,
        instructions: {
          txtRecord: {
            type: 'TXT',
            name: `_digiwise-verify.${domain}`,
            value: verificationToken,
          },
          cnameRecord: {
            type: 'CNAME',
            name: domain,
            value: 'digiwisesoftech.com',
          },
        },
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Verify domain ownership
  app.post<{ Params: { projectId: string; appName: string; domain: string } }>('/api/projects/:projectId/apps/:appName/domains/:domain/verify', {
    schema: {
      tags: ['Domains'],
      description: 'Verify domain ownership via DNS records',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          appName: { type: 'string' },
          domain: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, appName, domain } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      // Get the IngressRoute to find verification token
      const ingressRouteName = `${appName}-domain-${domain.replace(/\./g, '-')}`;
      let verificationToken = '';

      try {
        const ir: any = await k8s.k8sCustomApi.getNamespacedCustomObject({
          group: 'traefik.io',
          version: 'v1alpha1',
          namespace: project.k8sNamespace,
          plural: 'ingressroutes',
          name: ingressRouteName,
        });
        verificationToken = ir.metadata?.labels?.['verification-token'] || '';
      } catch {
        return reply.status(404).send({ error: 'Domain not found' });
      }

      // Verify TXT record
      let txtVerified = false;
      try {
        const txtRecords = await resolveTxt(`_digiwise-verify.${domain}`);
        txtVerified = txtRecords.some(records =>
          records.some(r => r === verificationToken)
        );
      } catch {
        txtVerified = false;
      }

      // Verify CNAME or A record
      let dnsVerified = false;
      try {
        const cnameRecords = await resolveCname(domain);
        dnsVerified = cnameRecords.some(cname =>
          cname.toLowerCase().includes('digiwisesoftech.com')
        );
      } catch {
        try {
          const aRecords = await resolve4(domain);
          // For A records, we'd need to check against the cluster IP
          // For now, just check if records exist
          dnsVerified = aRecords.length > 0;
        } catch {
          dnsVerified = false;
        }
      }

      const verified = txtVerified && dnsVerified;

      // Update IngressRoute labels
      if (verified) {
        const patch = [
          { op: 'replace', path: '/metadata/labels/domain-status', value: 'verified' },
        ];

        try {
          await k8s.k8sCustomApi.patchNamespacedCustomObject({
            group: 'traefik.io',
            version: 'v1alpha1',
            namespace: project.k8sNamespace,
            plural: 'ingressroutes',
            name: ingressRouteName,
            body: patch,
          });
        } catch {
          // Ignore patch errors
        }
      }

      return {
        domain,
        verified,
        txtVerified,
        dnsVerified,
        status: verified ? 'verified' : 'pending',
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Delete a custom domain
  app.delete<{ Params: { projectId: string; appName: string; domain: string } }>('/api/projects/:projectId/apps/:appName/domains/:domain', {
    schema: {
      tags: ['Domains'],
      description: 'Delete a custom domain',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          appName: { type: 'string' },
          domain: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, appName, domain } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      // Delete IngressRoute
      const ingressRouteName = `${appName}-domain-${domain.replace(/\./g, '-')}`;
      try {
        await k8s.k8sCustomApi.deleteNamespacedCustomObject({
          group: 'traefik.io',
          version: 'v1alpha1',
          namespace: project.k8sNamespace,
          plural: 'ingressroutes',
          name: ingressRouteName,
        });
      } catch {
        // Ignore if not found
      }

      // Delete Certificate
      const certName = `${appName}-cert-${domain.replace(/\./g, '-')}`;
      try {
        await k8s.k8sCustomApi.deleteNamespacedCustomObject({
          group: 'cert-manager.io',
          version: 'v1',
          namespace: project.k8sNamespace,
          plural: 'certificates',
          name: certName,
        });
      } catch {
        // Ignore if not found
      }

      // Delete TLS secret
      const secretName = `${appName}-tls-${domain.replace(/\./g, '-')}`;
      try {
        await k8s.k8sCoreApi.deleteNamespacedSecret({
          name: secretName,
          namespace: project.k8sNamespace,
        });
      } catch {
        // Ignore if not found
      }

      return { success: true, deleted: domain };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Get domain SSL status
  app.get<{ Params: { projectId: string; appName: string; domain: string } }>('/api/projects/:projectId/apps/:appName/domains/:domain/ssl', {
    schema: {
      tags: ['Domains'],
      description: 'Get SSL certificate status for a domain',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          appName: { type: 'string' },
          domain: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    const { projectId, appName, domain } = request.params;

    const project = await prisma.project.findFirst({
      where: user.role === 'admin'
        ? { id: projectId }
        : { id: projectId, userId: user.id },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    try {
      const certName = `${appName}-cert-${domain.replace(/\./g, '-')}`;

      try {
        const cert: any = await k8s.k8sCustomApi.getNamespacedCustomObject({
          group: 'cert-manager.io',
          version: 'v1',
          namespace: project.k8sNamespace,
          plural: 'certificates',
          name: certName,
        });

        const conditions = cert.status?.conditions || [];
        const readyCondition = conditions.find((c: any) => c.type === 'Ready');

        return {
          domain,
          sslStatus: readyCondition?.status === 'True' ? 'active' : 'provisioning',
          ready: readyCondition?.status === 'True',
          reason: readyCondition?.reason,
          message: readyCondition?.message,
          notAfter: cert.status?.notAfter,
          issuerRef: cert.spec?.issuerRef,
        };
      } catch {
        return {
          domain,
          sslStatus: 'unknown',
          ready: false,
          reason: 'Certificate not found',
        };
      }
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
