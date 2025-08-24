import { FastifyReply, FastifyRequest } from 'fastify';
import { Static } from '@sinclair/typebox';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { syncUserRolesToRedis } from '../lib/rbac-sync';
import {
  issueTokens,
  rotateRefresh,
  revokeSession,
  revokeAllUserSessions,
} from '../auth/session';

import {
  UsuarioBodySchema,
  UsuarioParamsSchema,
  UsuarioLoginSchema,
} from '../schemas/user.schema';

type Body = Static<typeof UsuarioBodySchema>;
type Params = Static<typeof UsuarioParamsSchema>;
type LoginBody = Static<typeof UsuarioLoginSchema>;

/** ===================== AUTH ===================== **/

export async function login(
  req: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
) {
  try {
    const { email, senha } = req.body ?? ({} as any);
    if (!email || !senha) {
      return reply.code(400).send({ error: 'email e senha obrigatórios' });
    }

    const candidate = email.trim().toLowerCase();

    const user = await prisma.usuario.findUnique({
      where: { email: candidate },
      select: { id: true, nome: true, email: true, senha: true },
    });

    if (!user || !user.senha) {
      req.server.log.warn({ email: candidate }, 'login: user not found or missing hash');
      return reply.code(401).send({ error: 'credenciais inválidas' });
    }

    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) {
      req.server.log.warn({ userId: user.id }, 'login: bcrypt compare failed');
      return reply.code(401).send({ error: 'credenciais inválidas' });
    }

    await syncUserRolesToRedis(req.server, user.id);

    const tokens = await issueTokens(req.server, {
      id: user.id,
      nome: user.nome ?? null,
      email: user.email,
    });

    return reply.send({
      message: 'Login realizado com sucesso',
      user: { id: user.id, nome: user.nome, email: user.email },
      ...tokens,
    });
  } catch (err) {
    req.server.log.error({ err }, 'login error');
    return reply.status(500).send({ error: 'Erro ao realizar login' });
  }
}

export async function refreshToken(
  req: FastifyRequest<{ Body: { refreshToken: string } }>,
  reply: FastifyReply
) {
  const { refreshToken } = req.body ?? ({} as any);
  if (!refreshToken) {
    return reply.code(400).send({ message: 'refreshToken obrigatório' });
  }
  try {
    const payload = req.server.jwt.verify<{ sub: number; jti: string }>(refreshToken);
    const sess = await req.server.redis.hgetall(`sess:${payload.jti}`);
    if (!sess || sess.valid !== '1') {
      return reply.code(401).send({ message: 'refresh inválido' });
    }
    const tokens = await rotateRefresh(req.server, payload.jti, payload.sub);
    return reply.send(tokens);
  } catch {
    return reply.code(401).send({ message: 'refresh inválido' });
  }
}

export async function logout(
  req: FastifyRequest<{ Body: { refreshToken: string } }>,
  reply: FastifyReply
) {
  const { refreshToken } = req.body ?? ({} as any);
  if (!refreshToken) {
    return reply.code(400).send({ message: 'refreshToken obrigatório' });
  }
  try {
    const payload = req.server.jwt.verify<{ sub: number; jti: string }>(refreshToken);
    await revokeSession(req.server, payload.jti, payload.sub);
    return reply.send({ ok: true });
  } catch {
    return reply.send({ ok: true });
  }
}

export async function logoutAll(req: FastifyRequest, reply: FastifyReply) {
  await revokeAllUserSessions(req.server, req.user.id);
  return reply.send({ ok: true });
}

export async function me(req: FastifyRequest, reply: FastifyReply) {
  const uid = req.user.id;
  const roles = await req.server.redis.smembers(`user:${String(uid)}:roles`);
  const pipe = req.server.redis.pipeline();
  roles.forEach((r) => pipe.smembers(`role:${r}:perms`));
  const raw = await pipe.exec();
  const perms = Array.from(new Set((raw ?? []).flatMap(([, v]) => (v ?? []) as string[])));
  return reply.send({ user: req.user, roles, perms });
}