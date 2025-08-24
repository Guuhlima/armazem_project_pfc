// src/lib/rbac-sync.ts
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
const prisma = new PrismaClient();

const userRolesKey = (userId: number | string) => `user:${String(userId)}:roles`;

export async function syncUserRolesToRedis(app: FastifyInstance, userId: number) {
  const rows = await prisma.usuarioRole.findMany({
    where: { usuarioId: userId },
    include: { role: true },
  });

  const pipe = app.redis.pipeline();
  pipe.del(userRolesKey(userId)); // zera para evitar sujeira antiga
  for (const r of rows) {
    pipe.sadd(userRolesKey(userId), r.role.nome);
  }
  await pipe.exec();
}
