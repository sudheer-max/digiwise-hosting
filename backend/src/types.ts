import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export type ResourceType =
  | 'deployment'
  | 'service'
  | 'pod'
  | 'configmap'
  | 'secret'
  | 'ingress'
  | 'namespace';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
