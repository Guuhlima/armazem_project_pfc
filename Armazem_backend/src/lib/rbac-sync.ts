import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
const prisma = new PrismaClient();

const userRolesKey = (userId: number | string) => `user:${String(userId)}:roles`;
const rolePermsKey = (role: string) => `role:${role}:perms`

export async function syncUserRolesToRedis(app: FastifyInstance, userId: number) {
  const rows = await prisma.usuarioRole.findMany({
    where: { usuarioId: userId },
    include: { role: true },
  });

  const pipe = app.redis.pipeline();
  pipe.del(userRolesKey(userId));
  for (const r of rows) {
    pipe.sadd(userRolesKey(userId), r.role.nome);
  }
  await pipe.exec();
}

export async function syncAllRolePermsToRedis(app: FastifyInstance) {
  const roles = await prisma.role.findMany({
    include: { perms: { include: { permission: true } } },
  });

  const pipe = app.redis.pipeline();
  for (const r of roles) {
    pipe.del(rolePermsKey(r.nome));
    const codes = r.perms.map((rp) => rp.permission.code);
    if (codes.length) pipe.sadd(rolePermsKey(r.nome), ...codes);
  }
  await pipe.exec();
}