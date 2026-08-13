import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const prisma = new PrismaClient();

const sessions = new Map<string, { email: string; password: string; host: string; port: number; secure: boolean; fromName: string }>();

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

function getSession(request: any): { email: string; password: string; host: string; port: number; secure: boolean; fromName: string } | null {
  const token = request.headers['x-email-token'];
  if (!token) return null;
  return sessions.get(token as string) || null;
}

export function emailRoutes(app: FastifyInstance, _opts: any, done: () => void) {

  // Create email session (no auth required — user provides Gmail credentials)
  app.post('/api/email/session', async (request: any, reply: any) => {
    const { email, password, host, port, secure, fromName } = request.body as any;
    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and app password are required' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, {
      email,
      password,
      host: host || 'smtp.gmail.com',
      port: port || 587,
      secure: secure !== false,
      fromName: fromName || '',
    });
    return { token, email, fromName: fromName || '' };
  });

  // Check session validity
  app.get('/api/email/session', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'No active session' });
    return { configured: true, email: s.email, fromName: s.fromName };
  });

  // Delete session
  app.delete('/api/email/session', async (request: any, reply: any) => {
    const token = request.headers['x-email-token'];
    if (token) sessions.delete(token as string);
    return { success: true };
  });

  // Send email
  app.post('/api/email/send', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Email session expired. Please re-enter your credentials.' });
    const { to, subject, body } = request.body as any;
    if (!to || !subject || !body) {
      return reply.status(400).send({ error: 'To, subject, and body are required' });
    }
    try {
      const transporter = nodemailer.createTransport({
        host: s.host,
        port: s.port,
        secure: s.secure,
        auth: { user: s.email, pass: s.password },
      });
      const info = await transporter.sendMail({
        from: `"${s.fromName || s.email}" <${s.email}>`,
        to,
        subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
      });

      // Save to sent folder
      await prisma.emailMessage.create({
        data: {
          userId: 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16),
          direction: 'sent',
          from: s.email,
          to,
          subject,
          body,
          folder: 'sent',
        },
      });
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to send: ${err.message}` });
    }
  });

  // Fetch inbox via IMAP (reads from Gmail)
  app.get('/api/email/inbox', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Session expired' });

    try {
      const ImapFlow = (await import('imapflow') as any).ImapFlow;
      const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: { user: s.email, pass: s.password },
        logger: false,
      });

      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const messages: any[] = [];
        const searchResult = await client.search('ALL', { uid: '*' });
        const uids = Array.isArray(searchResult) ? searchResult : [searchResult];

        // Get last 50 messages
        const recentUids = uids.slice(-50).reverse();

        for (const uid of recentUids) {
          try {
            const msg = await client.fetchOne(uid, { source: true, uid: true }, { uid: true });
            if (msg && msg.source) {
              const raw = msg.source.toString();
              const fromMatch = raw.match(/^From:\s*(.+)/mi);
              const toMatch = raw.match(/^To:\s*(.+)/mi);
              const subjectMatch = raw.match(/^Subject:\s*(.+)/mi);
              const dateMatch = raw.match(/^Date:\s*(.+)/mi);
              const bodyMatch = raw.match(/\r\n\r\n([\s\S]*)$/);

              messages.push({
                id: String(uid),
                uid: uid,
                from: fromMatch?.[1]?.replace(/"/g, '').trim() || '',
                to: toMatch?.[1]?.trim() || s.email,
                subject: subjectMatch?.[1]?.trim() || '(No Subject)',
                body: bodyMatch?.[1]?.trim() || '',
                date: dateMatch?.[1]?.trim() || '',
                read: false,
                folder: 'inbox',
              });
            }
          } catch { /* skip individual message errors */ }
        }
        return messages;
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (err: any) {
      // If IMAP fails, return saved messages from DB
      const userId = 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);
      const messages = await prisma.emailMessage.findMany({
        where: { userId, folder: 'inbox' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return messages;
    }
  });

  // List sent messages (from DB)
  app.get('/api/email/sent', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Session expired' });
    const userId = 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);
    const messages = await prisma.emailMessage.findMany({
      where: { userId, folder: 'sent' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return messages;
  });

  // Get single message
  app.get('/api/email/messages/:id', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Session expired' });
    const { id } = request.params as any;

    // Try fetching from IMAP
    try {
      const ImapFlow = (await import('imapflow') as any).ImapFlow;
      const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: { user: s.email, pass: s.password },
        logger: false,
      });
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const msg = await client.fetchOne(parseInt(id), { source: true, uid: true }, { uid: true });
        if (msg && msg.source) {
          const raw = msg.source.toString();
          const fromMatch = raw.match(/^From:\s*(.+)/mi);
          const toMatch = raw.match(/^To:\s*(.+)/mi);
          const subjectMatch = raw.match(/^Subject:\s*(.+)/mi);
          const dateMatch = raw.match(/^Date:\s*(.+)/mi);
          const bodyMatch = raw.match(/\r\n\r\n([\s\S]*)$/);
          return {
            id: String(id),
            uid: parseInt(id),
            from: fromMatch?.[1]?.replace(/"/g, '').trim() || '',
            to: toMatch?.[1]?.trim() || s.email,
            subject: subjectMatch?.[1]?.trim() || '(No Subject)',
            body: bodyMatch?.[1]?.trim() || '',
            date: dateMatch?.[1]?.trim() || '',
            read: false,
            folder: 'inbox',
          };
        }
      } finally {
        lock.release();
        await client.logout();
      }
    } catch { /* fallback to DB */ }

    const userId = 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);
    const message = await prisma.emailMessage.findFirst({ where: { id, userId } });
    if (!message) return reply.status(404).send({ error: 'Message not found' });
    return message;
  });

  // Delete message
  app.delete('/api/email/messages/:id', async (request: any) => {
    const s = getSession(request);
    if (!s) return { success: false };
    const { id } = request.params as any;
    const userId = 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);
    await prisma.emailMessage.deleteMany({ where: { id, userId } });
    return { success: true };
  });

  done();
}
