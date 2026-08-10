import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { config } from '../config.js';
import { prisma } from '../db/client.js';
import { applyPlanUpgrade, getUsageSnapshot, PLAN_CATALOG } from '../services/plan.js';
import { sendInvoiceEmail } from '../services/email.js';

export async function planRoutes(app: FastifyInstance) {
  app.get('/api/plan', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Plan'],
      description: 'Get current plan, service usage and limits',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const user = request.user as { id: string };
    const snapshot = await getUsageSnapshot(user.id);
    return { ...snapshot, plans: Object.values(PLAN_CATALOG) };
  });

  app.post('/api/plan/checkout', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Plan'],
      description: 'Create a Razorpay order to upgrade your plan',
      body: {
        type: 'object',
        required: ['plan'],
        properties: {
          plan: { type: 'string', enum: Object.keys(PLAN_CATALOG) },
          billing: { type: 'string', enum: ['monthly', 'yearly', 'twoYear'], default: 'twoYear' },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user as { id: string };
    const { plan, billing } = request.body as { plan: string; billing?: string };
    const def = PLAN_CATALOG[plan];
    if (!def || def.price <= 0) {
      return reply.status(400).send({ error: 'This plan does not require payment' });
    }

    const billingCycle = billing || 'twoYear';
    const monthlyPrice = def.pricing
      ? def.pricing[billingCycle as keyof typeof def.pricing] || def.pricing.twoYear
      : def.price;
    const months = billingCycle === 'monthly' ? 1 : billingCycle === 'yearly' ? 12 : 24;
    const totalAmount = monthlyPrice * months;

    const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
    const amount = Math.round(totalAmount * 100);
    const suffix = Math.random().toString(36).slice(2, 8);
    const receipt = `plan_${Date.now()}_${suffix}`;

    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt,
        notes: {
          userId: user.id,
          plan,
          billing: billingCycle,
          action: 'plan_upgrade',
        },
      }),
    });
    const razorpayOrder = await razorpayRes.json();
    if (!razorpayOrder.id) {
      return reply.status(502).send({ error: 'Failed to create Razorpay order' });
    }

    return {
      success: true,
      plan,
      planName: def.name,
      billing: billingCycle,
      monthlyPrice,
      months,
      totalAmount,
      amount,
      currency: 'INR',
      razorpayOrderId: razorpayOrder.id,
    };
  });

  // Activate pay-as-you-go (no payment required)
  app.post('/api/plan/activate-payg', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Plan'],
      description: 'Activate pay-as-you-go billing',
    },
  }, async (request) => {
    const user = request.user as { id: string };
    await applyPlanUpgrade(user.id, 'payg');
    return { success: true, plan: 'payg' };
  });

  // Admin: activate a plan directly (no payment)
  app.post('/api/plan/admin-activate', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Plan'],
      description: 'Admin: activate a plan without payment',
      body: {
        type: 'object',
        required: ['plan'],
        properties: {
          plan: { type: 'string' },
          billing: { type: 'string', enum: ['monthly', 'yearly', 'twoYear'], default: 'monthly' },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user as { id: string; role?: string };
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const { plan } = request.body as { plan: string; billing?: string };
    await applyPlanUpgrade(user.id, plan);
    return { success: true, plan };
  });

  app.get('/api/plan/razorpay-callback', {
    schema: {
      tags: ['Plan'],
      description: 'Razorpay redirect callback — verify payment and upgrade the user plan',
    },
  }, async (request, reply) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = request.query as Record<string, string>;
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return reply.redirect(`${config.frontendUrl}/console?plan=error&reason=invalid`, 302);
    }

    const expectedSig = crypto.createHmac('sha256', config.razorpay.keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    if (expectedSig !== razorpay_signature) {
      return reply.redirect(`${config.frontendUrl}/console?plan=error&reason=verification`, 302);
    }

    let userId = '';
    let plan = '';
    let billingCycle = 'twoYear';
    try {
      const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
      const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      const orderData = await orderRes.json();
      if (orderData.notes) {
        userId = orderData.notes.userId || '';
        plan = orderData.notes.plan || '';
        billingCycle = orderData.notes.billing || 'twoYear';
      }
    } catch {
      return reply.redirect(`${config.frontendUrl}/console?plan=error&reason=order`, 302);
    }

    if (!userId || !plan) {
      return reply.redirect(`${config.frontendUrl}/console?plan=error&reason=order-data`, 302);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
    if (!user) {
      return reply.redirect(`${config.frontendUrl}/console?plan=error&reason=user`, 302);
    }

    await applyPlanUpgrade(user.id, plan);

    const planDef = PLAN_CATALOG[plan];
    const monthlyPrice = planDef?.pricing
      ? planDef.pricing[billingCycle as keyof typeof planDef.pricing] || planDef.pricing.twoYear
      : planDef?.price || 0;
    const months = billingCycle === 'monthly' ? 1 : billingCycle === 'yearly' ? 12 : 24;
    const totalAmount = monthlyPrice * months;

    sendInvoiceEmail({
      email: user.email,
      name: user.name || user.email.split('@')[0],
      planName: planDef?.name || plan,
      billing: billingCycle,
      monthlyPrice,
      months,
      totalAmount,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      date: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
    }).catch(err => console.error('[Invoice] Failed to send:', err));

    return reply.redirect(`${config.frontendUrl}/console?plan=upgraded&planName=${encodeURIComponent(PLAN_CATALOG[plan]?.name || plan)}`, 302);
  });

  app.get('/api/plan/razorpay-cancel', {
    schema: { tags: ['Plan'], description: 'Razorpay cancel redirect — back to plans' },
  }, async (_request, reply) => {
    return reply.redirect(`${config.frontendUrl}/console?plan=cancelled`, 302);
  });
}
