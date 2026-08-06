import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import { getAuditLogs } from '../services/audit.js';

export async function auditRoutes(app: FastifyInstance) {
  // List audit logs (admin only)
  app.get<{
    Querystring: {
      userId?: string;
      action?: string;
      resource?: string;
      resourceId?: string;
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
    };
  }>('/api/audit-logs', {
    schema: {
      tags: ['Audit Logs'],
      description: 'List audit logs (admin only)',
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          action: { type: 'string' },
          resource: { type: 'string' },
          resourceId: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate, app.requireAdmin],
  }, async (request) => {
    const { userId, action, resource, resourceId, limit, offset, startDate, endDate } = request.query;

    const result = await getAuditLogs({
      userId,
      action,
      resource,
      resourceId,
      limit,
      offset,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return result;
  });

  // Get audit logs for current user
  app.get<{
    Querystring: {
      action?: string;
      resource?: string;
      limit?: number;
      offset?: number;
    };
  }>('/api/audit-logs/mine', {
    schema: {
      tags: ['Audit Logs'],
      description: 'Get audit logs for current user',
      querystring: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          resource: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: app.authenticate,
  }, async (request) => {
    const user = request.user as { id: string };
    const { action, resource, limit, offset } = request.query;

    const result = await getAuditLogs({
      userId: user.id,
      action,
      resource,
      limit,
      offset,
    });

    return result;
  });

  // Get audit log statistics (admin only)
  app.get('/api/audit-logs/stats', {
    schema: {
      tags: ['Audit Logs'],
      description: 'Get audit log statistics (admin only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate, app.requireAdmin],
  }, async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [total, last30Days, last7Days, last24Hours, actionCounts, topUsers] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      total,
      last30Days,
      last7Days,
      last24Hours,
      topActions: actionCounts.map(a => ({ action: a.action, count: a._count })),
      topUsers: topUsers.map(u => ({ userId: u.userId, count: u._count })),
    };
  });
}
