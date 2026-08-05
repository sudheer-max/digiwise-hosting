import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/client.js';
import { config } from '../config.js';

export async function authRoutes(app: FastifyInstance) {
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
          data: { githubId, avatarUrl: ghUser.avatar_url, name: ghUser.name || ghUser.login },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email: primaryEmail,
            name: ghUser.name || ghUser.login,
            password: '',
            githubId,
            avatarUrl: ghUser.avatar_url,
            role: 'user',
          },
        });
      }
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: ghUser.name || ghUser.login, avatarUrl: ghUser.avatar_url, email: primaryEmail },
      });
    }

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  });
}
