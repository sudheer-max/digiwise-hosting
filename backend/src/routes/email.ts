import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { Client as MinioClient } from 'minio';

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

function getMinioClient(): MinioClient {
  return new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT || 'minio.minio.svc.cluster.local',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    secretKey: process.env.MINIO_SECRET_KEY || '',
  });
}

const BUCKET = 'email-attachments';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
];

async function ensureBucket() {
  try {
    const minio = getMinioClient();
    const exists = await minio.bucketExists(BUCKET);
    if (!exists) {
      await minio.makeBucket(BUCKET, 'us-east-1');
    }
  } catch (err) {
    console.error('[Email] MinIO bucket check failed:', err);
  }
}

const SYSTEM_TEMPLATES = [
  {
    name: 'Welcome',
    subject: 'Welcome to DigiWise Hosting!',
    body: 'Hello {{name}},\n\nWelcome to DigiWise Hosting! Your account has been created successfully.\n\nHere are your next steps:\n1. Set up your first project\n2. Deploy your application\n3. Configure your domain\n\nBest regards,\nThe DigiWise Team',
    html: '<h2>Welcome to DigiWise Hosting!</h2><p>Hello <strong>{{name}}</strong>,</p><p>Your account has been created successfully.</p><h3>Next Steps:</h3><ol><li>Set up your first project</li><li>Deploy your application</li><li>Configure your domain</li></ol><p>Best regards,<br>The DigiWise Team</p>',
  },
  {
    name: 'Project Deployed',
    subject: 'Your project is now live!',
    body: 'Hello {{name}},\n\nYour project "{{projectName}}" has been deployed successfully.\n\nURL: {{projectUrl}}\n\nBest regards,\nThe DigiWise Team',
    html: '<h2>Your project is now live!</h2><p>Hello <strong>{{name}}</strong>,</p><p>Your project "<strong>{{projectName}}</strong>" has been deployed successfully.</p><p><a href="{{projectUrl}}">{{projectUrl}}</a></p><p>Best regards,<br>The DigiWise Team</p>',
  },
  {
    name: 'Payment Received',
    subject: 'Payment Confirmation - DigiWise Hosting',
    body: 'Hello {{name}},\n\nWe have received your payment of {{amount}} for {{planName}}.\n\nInvoice Number: {{invoiceNumber}}\n\nThank you for your business!\n\nBest regards,\nThe DigiWise Team',
    html: '<h2>Payment Confirmation</h2><p>Hello <strong>{{name}}</strong>,</p><p>We have received your payment of <strong>{{amount}}</strong> for <strong>{{planName}}</strong>.</p><p>Invoice Number: {{invoiceNumber}}</p><p>Thank you for your business!</p><p>Best regards,<br>The DigiWise Team</p>',
  },
  {
    name: 'Password Reset',
    subject: 'Password Reset Request - DigiWise Hosting',
    body: 'Hello {{name}},\n\nYou have requested a password reset. Please use the following code:\n\n{{resetCode}}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nThe DigiWise Team',
    html: '<h2>Password Reset Request</h2><p>Hello <strong>{{name}}</strong>,</p><p>You have requested a password reset. Please use the following code:</p><h1 style="font-size: 32px; color: #00459c; text-align: center; padding: 20px; background: #f4f6f9; border-radius: 8px;">{{resetCode}}</h1><p>This code will expire in 15 minutes.</p><p>If you did not request this, please ignore this email.</p><p>Best regards,<br>The DigiWise Team</p>',
  },
];

export function emailRoutes(app: FastifyInstance, _opts: any, done: () => void) {

  // Initialize MinIO bucket on startup
  ensureBucket();

  // ==================== ACCOUNT MANAGEMENT ====================

  // Create email account (persistent, stored in DB)
  app.post('/api/email/accounts', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Email session required' });

    const { email, provider, imapHost, imapPort, smtpHost, smtpPort, username, password, fromName } = request.body as any;
    if (!email || !password || !imapHost || !smtpHost) {
      return reply.status(400).send({ error: 'Email, password, IMAP host, and SMTP host are required' });
    }

    // Get userId from JWT if available, otherwise use session hash
    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);

    const encryptedPassword = encrypt(password);

    const account = await prisma.emailAccount.create({
      data: {
        userId,
        email,
        provider: provider || 'gmail',
        imapHost,
        imapPort: imapPort || 993,
        smtpHost,
        smtpPort: smtpPort || 587,
        username: username || email,
        password: encryptedPassword,
        fromName: fromName || '',
        isDefault: false,
      },
    });

    return { success: true, account: { ...account, password: undefined } };
  });

  // List email accounts
  app.get('/api/email/accounts', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Email session required' });

    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);
    const accounts = await prisma.emailAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map(a => ({ ...a, password: undefined }));
  });

  // Get single account
  app.get('/api/email/accounts/:id', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Email session required' });

    const { id } = request.params as any;
    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);

    const account = await prisma.emailAccount.findFirst({ where: { id, userId } });
    if (!account) return reply.status(404).send({ error: 'Account not found' });
    return { ...account, password: undefined };
  });

  // Update email account
  app.put('/api/email/accounts/:id', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Email session required' });

    const { id } = request.params as any;
    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);
    const { email, provider, imapHost, imapPort, smtpHost, smtpPort, username, password, fromName, isDefault } = request.body as any;

    const existing = await prisma.emailAccount.findFirst({ where: { id, userId } });
    if (!existing) return reply.status(404).send({ error: 'Account not found' });

    const data: any = {};
    if (email) data.email = email;
    if (provider) data.provider = provider;
    if (imapHost) data.imapHost = imapHost;
    if (imapPort) data.imapPort = imapPort;
    if (smtpHost) data.smtpHost = smtpHost;
    if (smtpPort) data.smtpPort = smtpPort;
    if (username) data.username = username;
    if (password) data.password = encrypt(password);
    if (fromName !== undefined) data.fromName = fromName;
    if (isDefault !== undefined) data.isDefault = isDefault;

    const account = await prisma.emailAccount.update({ where: { id }, data });
    return { success: true, account: { ...account, password: undefined } };
  });

  // Delete email account
  app.delete('/api/email/accounts/:id', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Email session required' });

    const { id } = request.params as any;
    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);

    const existing = await prisma.emailAccount.findFirst({ where: { id, userId } });
    if (!existing) return reply.status(404).send({ error: 'Account not found' });

    await prisma.emailAccount.delete({ where: { id } });
    return { success: true };
  });

  // ==================== SESSION (STANDALONE - NO LOGIN) ====================

  // Create email session (no auth required)
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
  app.delete('/api/email/session', async (request: any) => {
    const token = request.headers['x-email-token'];
    if (token) sessions.delete(token as string);
    return { success: true };
  });

  // ==================== SEND EMAIL ====================

  // Send email with attachments
  app.post('/api/email/send', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Email session expired. Please re-enter your credentials.' });

    const { to, subject, body, html, cc, bcc, attachments, accountId } = request.body as any;
    if (!to || !subject || !body) {
      return reply.status(400).send({ error: 'To, subject, and body are required' });
    }

    try {
      // If accountId provided, use stored account credentials
      let smtpConfig = { host: s.host, port: s.port, secure: s.secure, auth: { user: s.email, pass: s.password } };
      let fromEmail = s.email;
      let fromName = s.fromName || s.email;

      if (accountId) {
        const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);
        const account = await prisma.emailAccount.findFirst({ where: { id: accountId, userId } });
        if (account) {
          smtpConfig = {
            host: account.smtpHost,
            port: account.smtpPort,
            secure: account.smtpPort === 465,
            auth: { user: account.username, pass: decrypt(account.password) },
          };
          fromEmail = account.email;
          fromName = account.fromName || account.email;
        }
      }

      const transporter = nodemailer.createTransport(smtpConfig);

      // Handle attachments
      const mailAttachments: any[] = [];
      if (attachments && Array.isArray(attachments)) {
        for (const att of attachments) {
          if (att.id) {
            // Fetch from MinIO
            const minio = getMinioClient();
            const dataStream = await minio.getObject(BUCKET, att.id);
            const chunks: Buffer[] = [];
            for await (const chunk of dataStream) chunks.push(chunk);
            mailAttachments.push({
              filename: att.name || 'attachment',
              content: Buffer.concat(chunks),
              contentType: att.mimeType,
            });
          } else if (att.content) {
            mailAttachments.push({
              filename: att.name || 'attachment',
              content: Buffer.from(att.content, 'base64'),
              contentType: att.mimeType,
            });
          }
        }
      }

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        cc,
        bcc,
        subject,
        text: body,
        html: html || body.replace(/\n/g, '<br>'),
        attachments: mailAttachments.length > 0 ? mailAttachments : undefined,
      });

      // Save to sent folder
      const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);
      const message = await prisma.emailMessage.create({
        data: {
          userId,
          direction: 'sent',
          from: fromEmail,
          to,
          subject,
          body,
          html: html || body.replace(/\n/g, '<br>'),
          folder: 'sent',
        },
      });

      // Link attachments to message
      if (attachments && Array.isArray(attachments)) {
        for (const att of attachments) {
          if (att.id) {
            await prisma.emailAttachment.update({
              where: { id: att.id },
              data: { messageId: message.id },
            }).catch(() => {});
          }
        }
      }

      return { success: true, messageId: info.messageId, id: message.id };
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to send: ${err.message}` });
    }
  });

  // Send using template
  app.post('/api/email/send/template', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Session expired' });

    const { to, templateId, variables } = request.body as any;
    if (!to || !templateId) {
      return reply.status(400).send({ error: 'To and templateId are required' });
    }

    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);
    const template = await prisma.emailTemplate.findFirst({ where: { id: templateId, userId } });
    if (!template) return reply.status(404).send({ error: 'Template not found' });

    // Replace variables
    let subject = template.subject;
    let body = template.body;
    let html = template.html || '';
    if (variables && typeof variables === 'object') {
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, String(value));
        body = body.replace(regex, String(value));
        html = html.replace(regex, String(value));
      }
    }

    // Forward to send endpoint
    const sendResult = await fetch(`http://localhost:${process.env.PORT || 4000}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-email-token': request.headers['x-email-token'] || '',
      },
      body: JSON.stringify({ to, subject, body, html }),
    });

    return sendResult.json();
  });

  // ==================== INBOX / RECEIVED ====================

  // Fetch inbox via IMAP
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
            const msg = await client.fetchOne(uid, { source: true, uid: true, envelope: true, bodyStructure: true }, { uid: true });
            if (msg && msg.source) {
              const raw = msg.source.toString();
              const fromMatch = raw.match(/^From:\s*(.+)/mi);
              const toMatch = raw.match(/^To:\s*(.+)/mi);
              const subjectMatch = raw.match(/^Subject:\s*(.+)/mi);
              const dateMatch = raw.match(/^Date:\s*(.+)/mi);
              const bodyMatch = raw.match(/\r\n\r\n([\s\S]*)$/);

              // Check for attachments
              const hasAttachments = raw.includes('Content-Disposition: attachment') ||
                raw.includes('Content-Disposition: inline') && raw.includes('filename=');

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
                hasAttachments,
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
    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);
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

    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);
    const message = await prisma.emailMessage.findFirst({
      where: { id, userId },
      include: { attachments: true },
    });
    if (!message) return reply.status(404).send({ error: 'Message not found' });
    return message;
  });

  // Mark message as read
  app.post('/api/email/messages/:id/read', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Session expired' });
    const { id } = request.params as any;
    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);
    await prisma.emailMessage.updateMany({ where: { id, userId }, data: { read: true } });
    return { success: true };
  });

  // Delete message
  app.delete('/api/email/messages/:id', async (request: any) => {
    const s = getSession(request);
    if (!s) return { success: false };
    const { id } = request.params as any;
    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);
    await prisma.emailMessage.deleteMany({ where: { id, userId } });
    return { success: true };
  });

  // ==================== ATTACHMENTS ====================

  // Upload attachment
  app.post('/api/email/attachments', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Email session required' });

    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);

    try {
      const data = await request.file();
      if (!data) return reply.status(400).send({ error: 'No file provided' });

      const filename = data.filename || 'attachment';
      const mimetype = data.mimetype || 'application/octet-stream';

      // Validate file type
      if (!ALLOWED_TYPES.includes(mimetype) && !mimetype.startsWith('image/')) {
        return reply.status(400).send({ error: 'File type not allowed. Allowed: PDF, DOCX, XLSX, PNG, JPG, TXT, ZIP' });
      }

      // Read file content
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) chunks.push(chunk);
      const content = Buffer.concat(chunks);

      // Validate file size
      if (content.length > MAX_FILE_SIZE) {
        return reply.status(400).send({ error: 'File size exceeds 25MB limit' });
      }

      // Generate storage key
      const storageKey = `${userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${filename}`;

      // Upload to MinIO
      const minio = getMinioClient();
      await ensureBucket();
      await minio.putObject(BUCKET, storageKey, content, content.length, { 'Content-Type': mimetype });

      // Save to DB
      const attachment = await prisma.emailAttachment.create({
        data: {
          userId,
          fileName: filename,
          fileSize: content.length,
          mimeType: mimetype,
          storageKey,
        },
      });

      return { success: true, attachment };
    } catch (err: any) {
      return reply.status(500).send({ error: `Upload failed: ${err.message}` });
    }
  });

  // Download attachment
  app.get('/api/email/attachments/:id', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Email session required' });

    const { id } = request.params as any;
    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);

    const attachment = await prisma.emailAttachment.findFirst({ where: { id, userId } });
    if (!attachment) return reply.status(404).send({ error: 'Attachment not found' });

    try {
      const minio = getMinioClient();
      const dataStream = await minio.getObject(BUCKET, attachment.storageKey);
      const chunks: Buffer[] = [];
      for await (const chunk of dataStream) chunks.push(chunk);

      reply.header('Content-Type', attachment.mimeType);
      reply.header('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
      reply.send(Buffer.concat(chunks));
    } catch (err: any) {
      return reply.status(500).send({ error: `Download failed: ${err.message}` });
    }
  });

  // Delete attachment
  app.delete('/api/email/attachments/:id', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Email session required' });

    const { id } = request.params as any;
    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);

    const attachment = await prisma.emailAttachment.findFirst({ where: { id, userId } });
    if (!attachment) return reply.status(404).send({ error: 'Attachment not found' });

    // Delete from MinIO
    try {
      const minio = getMinioClient();
      await minio.removeObject(BUCKET, attachment.storageKey);
    } catch { /* continue even if MinIO delete fails */ }

    await prisma.emailAttachment.delete({ where: { id } });
    return { success: true };
  });

  // ==================== TEMPLATES ====================

  // List templates (system + user)
  app.get('/api/email/templates', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Email session required' });

    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);

    const userTemplates = await prisma.emailTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Combine system templates with user templates
    const systemTemplates = SYSTEM_TEMPLATES.map((t, i) => ({
      id: `system-${i}`,
      ...t,
      userId: 'system',
      isSystem: true,
      variables: extractVariables(t.subject + ' ' + t.body),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    return [...systemTemplates, ...userTemplates];
  });

  // Create template
  app.post('/api/email/templates', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Email session required' });

    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);
    const { name, subject, body, html } = request.body as any;

    if (!name || !subject || !body) {
      return reply.status(400).send({ error: 'Name, subject, and body are required' });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        userId,
        name,
        subject,
        body,
        html: html || body.replace(/\n/g, '<br>'),
        variables: extractVariables(subject + ' ' + body),
      },
    });

    return { success: true, template };
  });

  // Update template
  app.put('/api/email/templates/:id', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Email session required' });

    const { id } = request.params as any;
    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);
    const { name, subject, body, html } = request.body as any;

    const existing = await prisma.emailTemplate.findFirst({ where: { id, userId, isSystem: false } });
    if (!existing) return reply.status(404).send({ error: 'Template not found or is a system template' });

    const data: any = {};
    if (name) data.name = name;
    if (subject) data.subject = subject;
    if (body) data.body = body;
    if (html !== undefined) data.html = html;
    if (subject || body) {
      data.variables = extractVariables((subject || existing.subject) + ' ' + (body || existing.body));
    }

    const template = await prisma.emailTemplate.update({ where: { id }, data });
    return { success: true, template };
  });

  // Delete template
  app.delete('/api/email/templates/:id', async (request: any, reply: any) => {
    const s = getSession(request);
    if (!s) return reply.status(401).send({ error: 'Email session required' });

    const { id } = request.params as any;
    const userId = request.user?.id || 'session-' + crypto.createHash('sha256').update(s.email).digest('hex').slice(0, 16);

    const existing = await prisma.emailTemplate.findFirst({ where: { id, userId, isSystem: false } });
    if (!existing) return reply.status(404).send({ error: 'Template not found or is a system template' });

    await prisma.emailTemplate.delete({ where: { id } });
    return { success: true };
  });

  // ==================== EMAIL HOSTING PURCHASE ====================

  const EMAIL_HOST_PLANS: Record<string, { name: string; mailboxes: number; storage: string; domains: number; monthlyPrice: number; yearlyPrice: number }> = {
    'email-starter': { name: 'Starter', mailboxes: 1, storage: '5 GB', domains: 1, monthlyPrice: 49, yearlyPrice: 39 },
    'email-pro': { name: 'Professional', mailboxes: 5, storage: '10 GB', domains: 3, monthlyPrice: 199, yearlyPrice: 149 },
    'email-business': { name: 'Business', mailboxes: 25, storage: '25 GB', domains: 10, monthlyPrice: 499, yearlyPrice: 399 },
    'email-enterprise': { name: 'Enterprise', mailboxes: 100, storage: '50 GB', domains: 50, monthlyPrice: 999, yearlyPrice: 799 },
  };

  // Create email hosting order
  app.post('/api/email/hosting/checkout', async (request: any, reply: any) => {
    const { plan, billing } = request.body as any;
    if (!plan || !EMAIL_HOST_PLANS[plan]) {
      return reply.status(400).send({ error: 'Invalid plan' });
    }

    const planDef = EMAIL_HOST_PLANS[plan];
    const price = billing === 'yearly' ? planDef.yearlyPrice : planDef.monthlyPrice;
    const months = billing === 'yearly' ? 12 : 1;
    const totalAmount = price * months;

    // Create Razorpay order
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return reply.status(500).send({ error: 'Payment not configured' });
    }

    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: totalAmount * 100, // Razorpay uses paise
        currency: 'INR',
        receipt: `email-${plan}-${Date.now()}`,
      }),
    });

    const order = await orderResponse.json();
    if (!order.id) {
      return reply.status(500).send({ error: 'Failed to create order' });
    }

    return {
      razorpayOrderId: order.id,
      amount: totalAmount * 100,
      currency: 'INR',
      planName: planDef.name,
      billing,
      months,
    };
  });

  // Verify email hosting payment
  app.post('/api/email/hosting/verify', async (request: any, reply: any) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan, billing } = request.body as any;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return reply.status(400).send({ error: 'Missing payment details' });
    }

    // Verify signature
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return reply.status(400).send({ error: 'Invalid payment signature' });
    }

    // Get user from JWT or session
    const token = request.headers['authorization']?.replace('Bearer ', '') || request.headers['x-email-token'];
    let userId = 'session-' + crypto.createHash('sha256').update('anonymous').digest('hex').slice(0, 16);

    try {
      if (token && token.startsWith('eyJ')) {
        const decoded = request.server.jwt.verify(token) as any;
        userId = decoded.id;
      }
    } catch { /* use default userId */ }

    // Store purchase record
    const planDef = EMAIL_HOST_PLANS[plan];
    const price = billing === 'yearly' ? planDef.yearlyPrice : planDef.monthlyPrice;
    const months = billing === 'yearly' ? 12 : 1;

    // TODO: Store in a proper EmailHostingPurchase table
    // For now, log the purchase
    console.log(`[Email Hosting] Purchase verified: ${userId} bought ${planDef.name} (${billing}) for ₹${price * months}`);

    return {
      success: true,
      plan: planDef.name,
      billing,
      amount: price * months,
      mailboxes: planDef.mailboxes,
      storage: planDef.storage,
      domains: planDef.domains,
    };
  });

  // Get email hosting plans
  app.get('/api/email/hosting/plans', async () => {
    return EMAIL_HOST_PLANS;
  });

  done();
}

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}
