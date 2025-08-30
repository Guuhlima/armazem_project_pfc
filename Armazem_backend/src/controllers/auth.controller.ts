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

/** Helpers de cookie (mantenha em um lugar central se preferir) */
const isProd = process.env.NODE_ENV === 'production';

const cookieOpts = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProd,
  // domain: 'seu-dominio.com', // se necessário em prod
};

function setAuthCookies(reply: FastifyReply, tokens: { accessToken: string; refreshToken: string }) {
  // Se você quer trafegar 100% por cookie HttpOnly:
  reply.setCookie('accessToken', tokens.accessToken, cookieOpts);
  reply.setCookie('refreshToken', tokens.refreshToken, cookieOpts);
}

function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie('accessToken', cookieOpts);
  reply.clearCookie('refreshToken', cookieOpts);
}

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

    // garante roles no Redis para RBAC
    await syncUserRolesToRedis(req.server, user.id);

    const tokens = await issueTokens(req.server, {
      id: user.id,
      nome: user.nome ?? null,
      email: user.email,
    });

    // Opcional: setar cookies HttpOnly (recomendado)
    setAuthCookies(reply, tokens);

    return reply.send({
      message: 'Login realizado com sucesso',
      user: { id: user.id, nome: user.nome, email: user.email },
      ...tokens, // mantenho no payload se seu front depende disso
    });
  } catch (err) {
    req.server.log.error({ err }, 'login error');
    return reply.status(500).send({ error: 'Erro ao realizar login' });
  }
}

export async function refreshToken(
  req: FastifyRequest<{ Body: { refreshToken?: string } }>,
  reply: FastifyReply
) {
  try {
    // Aceita do body ou do cookie
    const bodyToken = req.body?.refreshToken;
    const cookieToken = (req.cookies as any)?.refreshToken as string | undefined;
    const refreshToken = bodyToken ?? cookieToken;

    if (!refreshToken) {
      return reply.code(400).send({ message: 'refreshToken obrigatório' });
    }

    const payload = req.server.jwt.verify<{ sub: number; jti: string }>(refreshToken);
    const sess = await req.server.redis.hgetall(`sess:${payload.jti}`);
    if (!sess || sess.valid !== '1') {
      return reply.code(401).send({ message: 'refresh inválido' });
    }

    const tokens = await rotateRefresh(req.server, payload.jti, payload.sub);

    // Atualiza cookies
    setAuthCookies(reply, tokens);

    return reply.send(tokens);
  } catch (err) {
    req.server.log.warn({ err }, 'refreshToken error');
    return reply.code(401).send({ message: 'refresh inválido' });
  }
}

export async function logout(
  req: FastifyRequest<{ Body: { refreshToken?: string } }>,
  reply: FastifyReply
) {
  try {
    // Tenta revogar a sessão do refresh atual (se presente)
    const bodyToken = req.body?.refreshToken;
    const cookieToken = (req.cookies as any)?.refreshToken as string | undefined;
    const refreshToken = bodyToken ?? cookieToken;

    if (refreshToken) {
      try {
        const payload = req.server.jwt.verify<{ sub: number; jti: string }>(refreshToken);
        await revokeSession(req.server, payload.jti, payload.sub);
      } catch (e) {
        // token inválido/expirado — segue a limpeza mesmo assim
        req.server.log.info({ e }, 'logout: refresh inválido, prosseguindo limpeza');
      }
    }

    // Limpa cookies sempre
    clearAuthCookies(reply);

    return reply.send({ ok: true });
  } catch (err) {
    req.server.log.error({ err }, 'logout error');
    // Mesmo em erro, tente limpar cookies para não deixar sessão presa no cliente
    clearAuthCookies(reply);
    return reply.send({ ok: true });
  }
}

export async function logoutAll(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = Number((req.user as any)?.id);
    if (!userId) return reply.code(401).send({ error: 'unauthorized' });

    await revokeAllUserSessions(req.server, userId);

    clearAuthCookies(reply);
    return reply.send({ ok: true });
  } catch (err) {
    req.server.log.error({ err }, 'logoutAll error');
    clearAuthCookies(reply);
    return reply.send({ ok: true });
  }
}

export async function me(req: FastifyRequest, reply: FastifyReply) {
  try {
    const uid = Number((req.user as any)?.id);
    if (!uid) return reply.code(401).send({ error: 'unauthorized' });

    const roles = await req.server.redis.smembers(`user:${String(uid)}:roles`);
    const pipe = req.server.redis.pipeline();
    roles.forEach((r) => pipe.smembers(`role:${r}:perms`));
    const raw = await pipe.exec();
    const perms = Array.from(
      new Set((raw ?? []).flatMap(([, v]) => (v ?? []) as string[]))
    );

    return reply.send({ user: req.user, roles, perms });
  } catch (err) {
    req.server.log.error({ err }, 'me error');
    return reply.status(500).send({ error: 'Erro ao obter perfil' });
  }
}
