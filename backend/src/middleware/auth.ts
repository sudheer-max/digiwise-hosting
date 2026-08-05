import { FastifyReply, FastifyRequest } from 'fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: 'Unauthorized' });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string; role: string };
    if (user.role !== 'admin') {
      reply.status(403).send({ error: 'Forbidden: Admin access required' });
    }
  } catch {
    reply.status(401).send({ error: 'Unauthorized' });
  }
}
