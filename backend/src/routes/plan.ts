import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { config } from '../config.js';
import { prisma } from '../db/client.js';
import { applyPlanUpgrade, getUsageSnapshot, PLAN_CATALOG } from '../services/plan.js';

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
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user as { id: string };
    const { plan } = request.body as { plan: string };
    const def = PLAN_CATALOG[plan];
    if (!def || def.price <= 0) {
      return reply.status(400).send({ error: 'This plan does not require payment' });
    }

    const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
    const amount = Math.round(def.price * 100);
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
    try {
      const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
      const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      const orderData = await orderRes.json();
      if (orderData.notes) {
        userId = orderData.notes.userId || '';
        plan = orderData.notes.plan || '';
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

    return reply.redirect(`${config.frontendUrl}/console?plan=upgraded&planName=${encodeURIComponent(PLAN_CATALOG[plan]?.name || plan)}`, 302);
  });

  app.get('/api/plan/razorpay-cancel', {
    schema: { tags: ['Plan'], description: 'Razorpay cancel redirect — back to plans' },
  }, async (_request, reply) => {
    return reply.redirect(`${config.frontendUrl}/console?plan=cancelled`, 302);
  });
}
