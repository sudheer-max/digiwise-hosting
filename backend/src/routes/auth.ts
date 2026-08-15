import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/client.js';
import { config } from '../config.js';

const otpStore = new Map<string, { code: string; expiresAt: number; purpose: string }>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(email: string, code: string, purpose: string): Promise<boolean> {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('[OTP] RESEND_API_KEY not set');
      return false;
    }

    const { Resend } = await import('resend');
    const resend = new Resend(resendApiKey);

    const subject = purpose === 'signup'
      ? `[DigiWise Hosting] Verify your email address`
      : `[DigiWise Hosting] Password reset code`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f6f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f4f6f9; padding: 40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
        <tr>
          <td style="background: linear-gradient(135deg, #00459c 0%, #002866 100%); padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 20px; margin: 0;">DigiWise Hosting</h1>
          </td>
        </tr>
        <tr><td style="padding: 32px; text-align: center;">
          <p style="font-size: 14px; color: #475569; margin: 0 0 16px;">
            ${purpose === 'signup' ? 'Thank you for signing up! Please verify your email address.' : 'You requested a password reset.'}
          </p>
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 16px 0;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Your verification code</p>
            <p style="font-size: 32px; font-weight: 800; color: #002866; margin: 0; letter-spacing: 8px; font-family: monospace;">${code}</p>
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin: 16px 0 0;">This code expires in 10 minutes.</p>
        </td></tr>
        <tr><td style="background: #f8fafc; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">
            DigiWise Softech — <a href="https://digiwisesoftech.com" style="color: #00459c;">digiwisesoftech.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await resend.emails.send({
      from: process.env.SMTP_FROM || 'noreply@digiwisesoftech.com',
      to: email,
      subject,
      html,
    });

    console.log(`[OTP] Sent ${purpose} OTP to ${email} via Resend`);
    return true;
  } catch (err: any) {
    console.error(`[OTP] Failed to send to ${email}:`, err.message);
    return false;
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/send-otp', {
    schema: {
      tags: ['Auth'],
      description: 'Send OTP code to email for verification',
      body: {
        type: 'object',
        required: ['email', 'purpose'],
        properties: {
          email: { type: 'string' },
          purpose: { type: 'string', enum: ['signup', 'reset'] },
        },
      },
    },
  }, async (request, reply) => {
    const { email, purpose } = request.body as { email: string; purpose: string };

    const code = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore.set(`${email}:${purpose}`, { code, expiresAt, purpose });

    const sent = await sendOtpEmail(email, code, purpose);
    if (!sent) {
      return reply.status(500).send({ error: 'Failed to send OTP email' });
    }

    return { success: true, message: 'OTP sent successfully' };
  });

  app.post('/api/auth/verify-otp', {
    schema: {
      tags: ['Auth'],
      description: 'Verify OTP code',
      body: {
        type: 'object',
        required: ['email', 'code', 'purpose'],
        properties: {
          email: { type: 'string' },
          code: { type: 'string' },
          purpose: { type: 'string', enum: ['signup', 'reset'] },
        },
      },
    },
  }, async (request, reply) => {
    const { email, code, purpose } = request.body as { email: string; code: string; purpose: string };

    const key = `${email}:${purpose}`;
    const stored = otpStore.get(key);

    if (!stored) {
      return reply.status(400).send({ error: 'No OTP found. Please request a new code.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(key);
      return reply.status(400).send({ error: 'OTP has expired. Please request a new code.' });
    }

    if (stored.code !== code) {
      return reply.status(400).send({ error: 'Invalid OTP code' });
    }

    otpStore.delete(key);
    return { success: true, message: 'OTP verified successfully' };
  });

  app.post('/api/auth/register', {
    schema: {
      tags: ['Auth'],
      description: 'Register a new user account',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password, name } = request.body as { email: string; password: string; name?: string };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name: name || email.split('@')[0] },
    });

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  });

  app.post('/api/auth/login', {
    schema: {
      tags: ['Auth'],
      description: 'Login with email and password',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  });

  app.get('/api/auth/me', {
    schema: { tags: ['Auth'], description: 'Get current user info' },
    preHandler: [app.authenticate],
  }, async (request) => {
    const user = request.user as { id: string };
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw { statusCode: 404, message: 'User not found' };
    return { id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role };
  });

  app.post('/api/auth/github', {
    schema: { tags: ['Auth'], description: 'GitHub OAuth login/signup' },
  }, async (request, reply) => {
    const { code } = request.body as { code: string };
    if (!code) return reply.status(400).send({ error: 'GitHub code required' });

    const { clientId, clientSecret } = config.github;
    if (!clientId || !clientSecret) {
      return reply.status(500).send({ error: 'GitHub OAuth not configured' });
    }

    let tokenResponse: any;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      tokenResponse = await res.json();
    } catch (e: any) {
      return reply.status(502).send({ error: 'Failed to contact GitHub', detail: e.message });
    }

    const accessToken = tokenResponse.access_token;
    if (!accessToken) {
      return reply.status(401).send({ error: tokenResponse.error_description || tokenResponse.error || 'Invalid GitHub code' });
    }

    let ghUser: any;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      ghUser = await res.json();
      if (ghUser.message) {
        return reply.status(502).send({ error: 'GitHub API error', detail: ghUser.message });
      }
    } catch (e: any) {
      return reply.status(502).send({ error: 'Failed to fetch GitHub user', detail: e.message });
    }

    let ghEmails: any[];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      ghEmails = await res.json();
    } catch (e) {
      ghEmails = [];
    }
    const primaryEmail = ghEmails.find((e: any) => e.primary && e.verified)?.email || ghUser.email || `gh-${ghUser.login}@users.noreply.github.com`;

    const githubId = String(ghUser.id);
    let user = await prisma.user.findFirst({ where: { githubId } });
    if (!user) {
      const existingByEmail = await prisma.user.findUnique({ where: { email: primaryEmail } });
      if (existingByEmail) {
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { githubId, githubToken: accessToken, avatarUrl: ghUser.avatar_url, name: ghUser.name || ghUser.login },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email: primaryEmail,
            name: ghUser.name || ghUser.login,
            password: '',
            githubId,
            githubToken: accessToken,
            avatarUrl: ghUser.avatar_url,
            role: 'user',
          },
        });
      }
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: ghUser.name || ghUser.login, avatarUrl: ghUser.avatar_url, email: primaryEmail, githubToken: accessToken },
      });
    }

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  });

  // Get stored GitHub token for current user
  app.get('/api/auth/github-token', {
    schema: { tags: ['Auth'], description: 'Get stored GitHub access token for current user' },
  }, async (request, reply) => {
    const user = request.user as { id: string };
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { githubToken: true, githubId: true } });
    if (!dbUser) return reply.status(404).send({ error: 'User not found' });
    return { githubToken: dbUser.githubToken || null, connected: !!dbUser.githubId };
  });

  // Get GitHub OAuth URL for connecting (with repo scope)
  app.get('/api/auth/github-connect-url', {
    schema: { tags: ['Auth'], description: 'Get GitHub OAuth URL for connecting account' },
  }, async () => {
    const clientId = config.github.clientId;
    if (!clientId) return { url: '' };
    const redirectUri = `${config.frontendUrl}/auth/github-callback`;
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return { url };
  });

  // Handle GitHub OAuth callback for connecting (stores token)
  app.post('/api/auth/github-connect', {
    schema: { tags: ['Auth'], description: 'Connect GitHub account - stores access token for private repo access' },
  }, async (request, reply) => {
    const currentUser = request.user as { id: string };
    const { code } = request.body as { code: string };
    if (!code) return reply.status(400).send({ error: 'GitHub code required' });

    const { clientId, clientSecret } = config.github;
    if (!clientId || !clientSecret) {
      return reply.status(500).send({ error: 'GitHub OAuth not configured' });
    }

    let tokenResponse: any;
    try {
      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
      });
      tokenResponse = await res.json();
    } catch (e: any) {
      return reply.status(502).send({ error: 'Failed to contact GitHub' });
    }

    const accessToken = tokenResponse.access_token;
    if (!accessToken) {
      return reply.status(401).send({ error: tokenResponse.error_description || 'Invalid code' });
    }

    // Store the token for the current user
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { githubToken: accessToken },
    });

    return { success: true, connected: true };
  });
}
