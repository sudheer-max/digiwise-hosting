import { prisma } from '../db/client.js';
import * as k8s from './kubernetes.js';

export class OwnershipError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

// === Project ownership (userId -> k8sNamespace) ===

export async function listOwnedProjectIds(userId: string): Promise<string[]> {
  const rows = await prisma.project.findMany({
    where: { userId },
    select: { k8sNamespace: true },
  });
  return rows.map((r) => r.k8sNamespace);
}

export async function getOwnedProject(userId: string, k8sNamespace: string) {
  return prisma.project.findFirst({ where: { userId, k8sNamespace } });
}

export async function assertProjectOwned(userId: string, k8sNamespace: string) {
  const row = await getOwnedProject(userId, k8sNamespace);
  if (!row) {
    throw new OwnershipError(403, 'Forbidden: you do not own this project');
  }
  return row;
}

export async function recordProjectOwnership(input: {
  userId: string;
  name: string;
  k8sNamespace: string;
}) {
  return prisma.project.upsert({
    where: { k8sNamespace: input.k8sNamespace },
    create: {
      userId: input.userId,
      name: input.name,
      k8sNamespace: input.k8sNamespace,
    },
    update: {
      userId: input.userId,
      name: input.name,
    },
  });
}

export async function removeProjectOwnership(k8sNamespace: string) {
  return prisma.project.deleteMany({ where: { k8sNamespace } });
}

// === Resource -> project resolution (via K8s labels) ===

export async function resolveResourceProjectId(resourceType: string, resourceName: string, namespace?: string): Promise<string | null> {
  // For K8s-native resources, check labels
  try {
    if (namespace) {
      const ns = await k8s.getNamespace(namespace);
      if (ns?.labels?.['digiwise-project-id']) {
        return ns.labels['digiwise-project-id'];
      }
    }
  } catch {
    // Fall through
  }
  return null;
}

export async function assertResourceOwned(userId: string, resourceType: string, resourceName: string, namespace?: string) {
  const projectId = await resolveResourceProjectId(resourceType, resourceName, namespace);
  if (!projectId) {
    throw new OwnershipError(404, 'Resource not found');
  }
  return assertProjectOwned(userId, projectId);
}
