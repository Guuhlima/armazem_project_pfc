// tests/utils/buildTestApp.ts
import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJWT from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifySensible from '@fastify/sensible';
import RedisMock from 'ioredis-mock';
import type { FastifyRedis } from '@fastify/redis';

import { authRoutes } from '../../src/routes/auth.routes';
import { usuariosRoutes } from '../../src/routes/user.routes';
import rbacPlugin from '../../src/plugins/rbac';

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = fastify({
    ajv: { customOptions: { coerceTypes: true } },
  });

  // 🔧 Modo de escopo “solto” só nos testes (mantém tua lógica em produção)
  process.env.RBAC_SCOPE_MODE = process.env.RBAC_SCOPE_MODE ?? 'loose';

  // 🔐 JWT + Cookie
  app.register(fastifyJWT, { secret: process.env.JWT_SECRET! });
  app.register(fastifyCookie);
  app.register(fastifySensible);

  // 🧪 Redis mock com API compatível
  const redis = new (RedisMock as any)();
  app.decorate('redis', redis as unknown as FastifyRedis);

  app.addHook('onClose', async () => {
    try { await (app.redis as any).quit?.(); } catch {}
  });

  // ✅ Normaliza o payload do JWT para tua lógica “id” (cobre tokens com sub/id/userId)
  app.addHook('preHandler', async (req) => {
    const u: any = (req as any).user;
    if (u) {
      if (u.id == null) {
        u.id = u.sub ?? u.userId ?? u.uid ?? null;
      }
      // se ainda vier string, força número quando fizer sentido
      const n = Number(u.id);
      if (Number.isFinite(n)) u.id = n;
    }
  });

  // 🔒 Decorator de authenticate simples (se usar)
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try { await request.jwtVerify(); }
    catch { return reply.code(401).send({ error: 'Unauthorized' }); }
  });

  // 🧯 Error handler para não transformar 401/403/409 em 500
  app.setErrorHandler((err, _req, reply) => {
    console.error('[fastify error]', err);
    const anyErr: any = err;
    if (typeof anyErr.statusCode === 'number') {
      return reply.code(anyErr.statusCode).send({ error: anyErr.message || 'Error' });
    }
    const code = anyErr.code;
    if (code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' ||
        code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' ||
        code === 'FST_JWT_MALFORMED') {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    if (code === 'RBAC_FORBIDDEN' || err.name === 'ForbiddenError') {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    if (code === 'P2002') return reply.code(409).send({ error: 'Conflict' });
    reply.code(500).send({ error: 'Internal Server Error' });
  });

  // 🔁 Plugins e rotas
  await app.register(rbacPlugin);            // teu plugin pode usar app.redis
  await app.register(authRoutes);
  await app.register(usuariosRoutes, { prefix: '/usuarios' });

  await app.ready();
  return app;
}
