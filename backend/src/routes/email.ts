import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const prisma = new PrismaClient();

function encrypt(text: string): string {
  const key = process.env.JWT_SECRET || 'dev-secret';
  const hash = crypto.createHash('sha256').update(key).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', hash, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const key = process.env.JWT_SECRET || 'dev-secret';
  const hash = crypto.createHash('sha256').update(key).digest();
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', hash, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function getGmailTransporter(config: { email: string; password: string; host: string; port: number; secure: boolean }) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.email,
      pass: config.password,
    },
  });
}

export function emailRoutes(app: FastifyInstance, _opts: any, done: () => void) {

  // Get email config
  app.get('/api/email/config', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    const userId = request.user.id;
    const config = await prisma.emailConfig.findUnique({ where: { userId } });
    if (!config) return { configured: false };
    return {
      configured: true,
      id: config.id,
      provider: config.provider,
      email: config.email,
      host: config.host,
      port: config.port,
      secure: config.secure,
      fromName: config.fromName,
      createdAt: config.createdAt,
    };
  });

  // Save/update email config
  app.post('/api/email/config', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    const userId = request.user.id;
    const { email, password, host, port, secure, fromName } = request.body as any;
    if (!email || !password) {
      return (reply: any) => reply.status(400).send({ error: 'Email and password are required' });
    }
    const encryptedPass = encrypt(password);
    const config = await prisma.emailConfig.upsert({
      where: { userId },
      create: {
        userId,
        provider: 'gmail',
        email,
        password: encryptedPass,
        host: host || 'smtp.gmail.com',
        port: port || 587,
        secure: secure !== false,
        fromName: fromName || null,
      },
      update: {
        email,
        password: encryptedPass,
        host: host || 'smtp.gmail.com',
        port: port || 587,
        secure: secure !== false,
        fromName: fromName || null,
      },
    });
    return { configured: true, id: config.id, email: config.email };
  });

  // Delete email config
  app.delete('/api/email/config', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    const userId = request.user.id;
    await prisma.emailConfig.deleteMany({ where: { userId } });
    return { success: true };
  });

  // Test email
  app.post('/api/email/test', { preHandler: [(app as any).authenticate] }, async (request: any, reply: any) => {
    const userId = request.user.id;
    const config = await prisma.emailConfig.findUnique({ where: { userId } });
    if (!config) return reply.status(400).send({ error: 'Email not configured. Save your Gmail credentials first.' });
    try {
      const transporter = getGmailTransporter({
        email: config.email,
        password: decrypt(config.password),
        host: config.host,
        port: config.port,
        secure: config.secure,
      });
      await transporter.sendMail({
        from: `"${config.fromName || 'DigiWise'}" <${config.email}>`,
        to: config.email,
        subject: 'DigiWise — Email Configuration Test',
        html: '<h2>Email Configuration Working!</h2><p>Your Gmail SMTP is configured correctly. You can now send and receive emails from the DigiWise console.</p>',
      });
      return { success: true, message: 'Test email sent successfully' };
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to send test email: ${err.message}` });
    }
  });

  // Send email
  app.post('/api/email/send', { preHandler: [(app as any).authenticate] }, async (request: any, reply: any) => {
    const userId = request.user.id;
    const { to, subject, body } = request.body as any;
    if (!to || !subject || !body) {
      return reply.status(400).send({ error: 'To, subject, and body are required' });
    }
    const config = await prisma.emailConfig.findUnique({ where: { userId } });
    if (!config) return reply.status(400).send({ error: 'Email not configured. Save your Gmail credentials first.' });
    try {
      const transporter = getGmailTransporter({
        email: config.email,
        password: decrypt(config.password),
        host: config.host,
        port: config.port,
        secure: config.secure,
      });
      const info = await transporter.sendMail({
        from: `"${config.fromName || 'DigiWise'}" <${config.email}>`,
        to,
        subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
      });
      // Save sent message
      await prisma.emailMessage.create({
        data: {
          userId,
          direction: 'sent',
          from: config.email,
          to,
          subject,
          body,
          folder: 'sent',
        },
      });
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to send email: ${err.message}` });
    }
  });

  // List inbox messages
  app.get('/api/email/inbox', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    const userId = request.user.id;
    const messages = await prisma.emailMessage.findMany({
      where: { userId, folder: 'inbox' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return messages;
  });

  // List sent messages
  app.get('/api/email/sent', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    const userId = request.user.id;
    const messages = await prisma.emailMessage.findMany({
      where: { userId, folder: 'sent' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return messages;
  });

  // Get single message
  app.get('/api/email/messages/:id', { preHandler: [(app as any).authenticate] }, async (request: any, reply: any) => {
    const userId = request.user.id;
    const { id } = request.params as any;
    const message = await prisma.emailMessage.findFirst({ where: { id, userId } });
    if (!message) return reply.status(404).send({ error: 'Message not found' });
    if (message.folder === 'inbox' && !message.read) {
      await prisma.emailMessage.update({ where: { id }, data: { read: true } });
    }
    return message;
  });

  // Delete message
  app.delete('/api/email/messages/:id', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    const userId = request.user.id;
    const { id } = request.params as any;
    await prisma.emailMessage.deleteMany({ where: { id, userId } });
    return { success: true };
  });

  // Mark as read/unread
  app.patch('/api/email/messages/:id', { preHandler: [(app as any).authenticate] }, async (request: any) => {
    const userId = request.user.id;
    const { id } = request.params as any;
    const { read } = request.body as any;
    await prisma.emailMessage.updateMany({ where: { id, userId }, data: { read: !!read } });
    return { success: true };
  });

  done();
}
