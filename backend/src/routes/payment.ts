import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import { getTotalWithTax, getCurrencyForCountry, getSupportedCountries } from '../services/currency.js';
import { config } from '../config.js';
import crypto from 'crypto';
import { sendHostingConfirmation } from '../services/email.js';

export async function paymentRoutes(app: FastifyInstance) {
  app.post('/api/domains/checkout', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Payment'],
      description: 'Create unified Razorpay order for hosting plans',
      body: {
        type: 'object',
        required: ['items', 'customer'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                price: { type: 'number' },
                years: { type: 'number' },
                type: { type: 'string', enum: ['domain', 'hosting'] },
              },
            },
          },
          customer: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              address: { type: 'object' },
            },
          },
          countryCode: { type: 'string', default: 'US' },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user as { id: string };
    const { items, customer, countryCode } = request.body as any;
    const cc = (countryCode || 'US').toUpperCase();

    const totalUsd = items.reduce((sum: number, i: any) => sum + i.price, 0);
    const pricing = getTotalWithTax(totalUsd, cc);
    const totalLocal = Math.round(pricing.total * 100) / 100;

    const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
    const suffix = Math.random().toString(36).slice(2, 8);
    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount: Math.round(totalLocal * 100),
        currency: pricing.currency.code.toUpperCase(),
        receipt: `dgw_${Date.now()}_${suffix}`,
        notes: {
          userId: user.id,
          items: JSON.stringify(items),
          customer: JSON.stringify(customer),
          countryCode: cc,
        },
      }),
    });
    const razorpayOrder = await razorpayRes.json();
    if (!razorpayOrder.id) {
      return reply.status(502).send({ error: 'Failed to create Razorpay order' });
    }

    return {
      success: true,
      orderId: razorpayOrder.receipt,
      razorpayOrderId: razorpayOrder.id,
      total: totalLocal,
      currency: pricing.currency.code,
      amount: razorpayOrder.amount,
    };
  });

  app.get('/api/domains/currencies', {
    schema: { tags: ['Payment'], description: 'Get supported countries and currencies' },
  }, async () => {
    return getSupportedCountries();
  });

  app.get('/api/checkout/razorpay-callback', {
    schema: {
      tags: ['Payment'],
      description: 'Razorpay redirect callback — verify payment and redirect to success',
    },
  }, async (request, reply) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = request.query as Record<string, string>;
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return reply.redirect(`${config.frontendUrl}/checkout?error=Invalid+callback`, 302);
    }

    const expectedSig = crypto.createHmac('sha256', config.razorpay.keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    if (expectedSig !== razorpay_signature) {
      return reply.redirect(`${config.frontendUrl}/checkout?error=Payment+verification+failed`, 302);
    }

    let customer: any = {};
    let userId = '';
    try {
      const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
      const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      const orderData = await orderRes.json();
      if (orderData.notes) {
        customer = JSON.parse(orderData.notes.customer || '{}');
        userId = orderData.notes.userId || '';
      }
    } catch {
      return reply.redirect(`${config.frontendUrl}/checkout?error=Failed+to+fetch+order`, 302);
    }
    if (!userId) {
      return reply.redirect(`${config.frontendUrl}/checkout?error=Order+data+not+found`, 302);
    }

    const orderId = razorpay_order_id;
    const user = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
    setImmediate(async () => {
      await sendHostingConfirmation({
        clientName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Valued Customer',
        email: customer.email || user?.email || '',
        planName: 'Hosting Plan',
        orderId: razorpay_order_id,
      });
    });

    const params = new URLSearchParams({
      orderId,
      razorpayPaymentId: razorpay_payment_id,
      planName: 'Hosting Plan',
      clientName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      email: customer.email || user?.email || '',
    });
    return reply.redirect(`${config.frontendUrl}/success?${params.toString()}`, 302);
  });

  app.post('/api/checkout/send-confirmation', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Payment'],
      description: 'Send hosting confirmation email',
      body: {
        type: 'object',
        required: ['planName', 'orderId'],
        properties: {
          planName: { type: 'string' },
          orderId: { type: 'string' },
          clientName: { type: 'string' },
          email: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user as { id: string };
    const { planName, orderId, clientName, email } = request.body as {
      planName: string; orderId: string; clientName?: string; email?: string;
    };

    const userRecord = await prisma.user.findUnique({ where: { id: user.id } });
    const recipientEmail = email || userRecord?.email || '';

    if (!recipientEmail) {
      return reply.status(400).send({ error: 'No recipient email available' });
    }

    setImmediate(async () => {
      await sendHostingConfirmation({
        clientName: clientName || userRecord?.name || 'Valued Customer',
        email: recipientEmail,
        planName,
        orderId,
      });
    });

    return { success: true, message: `Confirmation email queued to ${recipientEmail}` };
  });

  app.get('/api/checkout/razorpay-cancel', {
    schema: { tags: ['Payment'], description: 'Razorpay cancel redirect — back to checkout' },
  }, async (_request, reply) => {
    return reply.redirect(`${config.frontendUrl}/checkout?error=Payment+cancelled`, 302);
  });
}
