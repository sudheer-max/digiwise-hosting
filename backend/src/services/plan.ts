import { prisma } from '../db/client.js';
import { listOwnedProjectIds } from './ownership.js';
import { listDeployments, listPods } from './kubernetes.js';

export interface PlanDefinition {
  key: string;
  name: string;
  price: number;
  serviceLimit: number;
  description: string;
  highlighted?: boolean;
  billing: 'free' | 'meter' | 'flat';
}

export const PLAN_CATALOG: Record<string, PlanDefinition> = {
  trial: { key: 'trial', name: 'Free Trial', price: 0, serviceLimit: 4, description: 'Free for 30 days - up to 4 services', billing: 'free' },
  pro: { key: 'pro', name: 'Pro', price: 10, serviceLimit: 0, description: 'Flat $10/mo - unlimited services, keep everything running', billing: 'flat', highlighted: true },
};

export const TRIAL_DAYS = 30;
export const CREDIT_HOUR_RATE = 1;

export type ServiceInfo = {
  serviceId: string;
  name: string;
  serviceType: 'app' | 'database';
  namespace: string;
};

export class PlanError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function listUserServices(userId: string): Promise<ServiceInfo[]> {
  const namespaces = await listOwnedProjectIds(userId);
  const out: ServiceInfo[] = [];

  for (const ns of namespaces) {
    try {
      const deployments = await listDeployments(ns);
      for (const dep of deployments) {
        out.push({
          serviceId: `${ns}/${dep.name}`,
          name: dep.name,
          serviceType: 'app',
          namespace: ns,
        });
      }
    } catch {
      // Namespace might not exist yet
    }
  }

  return out;
}

export async function listRunningServiceIds(services: ServiceInfo[]): Promise<Set<string>> {
  const running = new Set<string>();

  for (const s of services) {
    try {
      const pods = await listPods(s.namespace);
      const runningPods = pods.filter(p => p.phase === 'Running');
      if (runningPods.length > 0) {
        running.add(s.serviceId);
      }
    } catch {
      // Ignore errors
    }
  }

  return running;
}

export async function countUserServices(userId: string) {
  const list = await listUserServices(userId);
  return {
    apps: list.filter((s) => s.serviceType === 'app').length,
    databases: list.filter((s) => s.serviceType === 'database').length,
    total: list.length,
  };
}

export async function accrueUsage(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const now = new Date();
  const last = user.lastMeteredAt;
  if (!last) {
    await prisma.user.updateMany({ where: { id: userId }, data: { lastMeteredAt: now } });
    return;
  }

  const hours = (now.getTime() - last.getTime()) / (60 * 60 * 1000);
  const services = await listUserServices(userId);
  const runningIds = await listRunningServiceIds(services);
  const periodKey = monthKey(now);

  for (const s of services) {
    if (!runningIds.has(s.serviceId)) continue;
    const credits = Math.max(0, hours) * CREDIT_HOUR_RATE;
    if (credits <= 0) continue;
    await prisma.usageMeter.upsert({
      where: { userId_serviceId_period: { userId, serviceId: s.serviceId, period: periodKey } },
      create: {
        userId,
        serviceId: s.serviceId,
        serviceName: s.name,
        serviceType: s.serviceType,
        period: periodKey,
        credits,
        running: true,
      },
      update: { credits: { increment: credits }, running: true },
    });
  }

  await prisma.user.updateMany({ where: { id: userId }, data: { lastMeteredAt: now } });
}

export async function getUserPlanState(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new PlanError(404, 'User not found');

  const plan = PLAN_CATALOG[user.plan] || PLAN_CATALOG.trial;
  const serviceLimit = user.serviceLimit > 0 ? user.serviceLimit : plan.serviceLimit;
  const unlimited = serviceLimit <= 0;

  const trialStartedAt = user.planStartedAt || user.createdAt;
  const trialEndsAt = new Date(trialStartedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const daysLeft = Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

  return {
    plan: {
      key: plan.key,
      name: plan.name,
      price: plan.price,
      serviceLimit,
      unlimited,
      description: plan.description,
      billing: plan.billing,
    },
    planStatus: user.planStatus,
    planStartedAt: user.planStartedAt,
    planRenewsAt: user.planRenewsAt,
    trial: {
      startedAt: trialStartedAt,
      endsAt: trialEndsAt,
      daysLeft,
    },
  };
}

export async function getUsageSnapshot(userId: string) {
  await accrueUsage(userId);
  const planState = await getUserPlanState(userId);
  const usage = await countUserServices(userId);
  const services = await listUserServices(userId);
  const runningIds = await listRunningServiceIds(services);
  const runningNow = services.filter((s) => runningIds.has(s.serviceId)).length;

  const periodKey = monthKey(new Date());
  const meters = await prisma.usageMeter.findMany({
    where: { userId, period: periodKey },
    orderBy: { credits: 'desc' },
  });
  const creditsThisMonth = Math.round(meters.reduce((s, m) => s + m.credits, 0) * 100) / 100;

  return {
    ...planState,
    usage: {
      ...usage,
      limit: planState.plan.serviceLimit,
      unlimited: planState.plan.unlimited,
      remaining: planState.plan.unlimited ? null : Math.max(0, planState.plan.serviceLimit - usage.total),
      credits: creditsThisMonth,
      runningNow,
    },
  };
}

export async function assertCanCreateService(userId: string) {
  const planState = await getUserPlanState(userId);
  const usage = await countUserServices(userId);

  if (planState.planStatus === 'suspended') {
    throw new PlanError(403, 'Your account is suspended. Upgrade your plan to continue.');
  }

  if (planState.planStatus === 'trial' && planState.trial.daysLeft <= 0) {
    throw new PlanError(402, 'Your free trial has ended. Upgrade to Pro to keep deploying.');
  }

  if (!planState.plan.unlimited && usage.total >= planState.plan.serviceLimit) {
    throw new PlanError(409, `You have reached your limit of ${planState.plan.serviceLimit} services on the free trial. Upgrade to Pro for unlimited services.`);
  }
}

export async function applyPlanUpgrade(userId: string, planKey: string) {
  const plan = PLAN_CATALOG[planKey];
  if (!plan) throw new PlanError(400, `Unknown plan "${planKey}"`);

  const now = new Date();
  const renewsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      plan: plan.key,
      planStatus: 'active',
      serviceLimit: plan.serviceLimit,
      planStartedAt: now,
      planRenewsAt: renewsAt,
    },
  });

  return getUserPlanState(user.id);
}