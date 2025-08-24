// src/auth/session.ts
import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';

export type Tokens = { accessToken: string; refreshToken: string };

type UserLike = {
  id: number;
  nome?: string | null;
  email?: string | null;
  permissoes?: string[];
};

const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const REFRESH_TTL_SEC = 60 * 60 * 24 * 7;

const sessionKey = (jti: string) => `sess:${jti}`;
const userSessionsKey = (userId: number | string) => `user:${String(userId)}:sessions`;

/** Emite access (curto) + refresh (longo) e registra a sessão no Redis */
export async function issueTokens(app: FastifyInstance, user: UserLike): Promise<Tokens> {
  const jti = randomUUID();
  const now = Math.floor(Date.now() / 1000);

  // Access token: incluem só os campos que existirem (evita TS reclamar)
  const accessToken = app.jwt.sign(
    {
      sub: user.id,
      ...(user.nome != null ? { nome: user.nome } : {}),
      ...(user.email ? { email: user.email } : {}),
      ...(user.permissoes ? { permissoes: user.permissoes } : {}),
    },
    { expiresIn: ACCESS_TTL }
  );

  // Refresh token: com jti
  const refreshToken = app.jwt.sign({ sub: user.id, jti }, { expiresIn: REFRESH_TTL });

  // Sessão no Redis
  await app.redis
    .multi()
    .hmset(sessionKey(jti), { userId: String(user.id), valid: '1', iat: String(now) })
    .expire(sessionKey(jti), REFRESH_TTL_SEC)
    .sadd(userSessionsKey(user.id), jti)
    .exec();

  return { accessToken, refreshToken };
}

/** Rotaciona o refresh: invalida o jti antigo e emite novos tokens */
export async function rotateRefresh(
  app: FastifyInstance,
  oldJti: string,
  userId: number,
  user?: UserLike
): Promise<Tokens> {
  await app.redis.hset(sessionKey(oldJti), 'valid', '0');
  return issueTokens(app, {
    id: userId,
    nome: user?.nome ?? null,
    email: user?.email ?? null,
    permissoes: user?.permissoes,
  });
}

/** Revoga uma sessão específica (por jti) */
export async function revokeSession(app: FastifyInstance, jti: string, userId?: number) {
  await app.redis.hset(sessionKey(jti), 'valid', '0');
  if (userId != null) await app.redis.srem(userSessionsKey(userId), jti);
}

/** Revoga todas as sessões do usuário */
export async function revokeAllUserSessions(app: FastifyInstance, userId: number) {
  const jtIs = await app.redis.smembers(userSessionsKey(userId));
  if (jtIs.length) {
    const multi = app.redis.multi();
    jtIs.forEach((id) => multi.hset(sessionKey(id), 'valid', '0'));
    multi.del(userSessionsKey(userId));
    await multi.exec();
  }
}
    