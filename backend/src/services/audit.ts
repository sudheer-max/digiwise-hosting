import { prisma } from '../db/client.js';

export interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failure';
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details || undefined,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        status: entry.status || 'success',
      },
    });
  } catch (err) {
    // Don't let audit logging failures break the main flow
    console.error('Failed to write audit log:', err);
  }
}

export async function getAuditLogs(params: {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const where: any = {};

  if (params.userId) where.userId = params.userId;
  if (params.action) where.action = params.action;
  if (params.resource) where.resource = params.resource;
  if (params.resourceId) where.resourceId = params.resourceId;

  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) where.createdAt.gte = params.startDate;
    if (params.endDate) where.createdAt.lte = params.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
      skip: params.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
