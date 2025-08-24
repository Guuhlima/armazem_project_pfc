// scripts/sync-rbac-redis.ts
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

const userRolesKey = (userId: number | string) => `user:${String(userId)}:roles`;
const rolePermsKey = (roleName: string) => `role:${roleName}:perms`;

async function main() {
  const [roles, perms, usuarioRoles, rolePerms] = await Promise.all([
    prisma.role.findMany(),
    prisma.permission.findMany(),
    prisma.usuarioRole.findMany(),
    prisma.rolePerm.findMany(),
  ]);

  const roleNameById = new Map(roles.map(r => [r.id, r.nome]));
  const permCodeById = new Map(perms.map(p => [p.id, p.code]));

  // Role -> Perms
  const permsByRole = new Map<string, string[]>();
  for (const rp of rolePerms) {
    const roleName = roleNameById.get(rp.roleId)!;
    const code = permCodeById.get(rp.permissionId)!;
    const arr = permsByRole.get(roleName) ?? [];
    arr.push(code);
    permsByRole.set(roleName, arr);
  }
  for (const [roleName, codes] of permsByRole.entries()) {
    const key = rolePermsKey(roleName);
    await redis.del(key);
    if (codes.length) await redis.sadd(key, ...codes);
  }

  // User -> Roles
  const rolesByUser = new Map<number, string[]>();
  for (const ur of usuarioRoles) {
    const roleName = roleNameById.get(ur.roleId)!;
    const arr = rolesByUser.get(ur.usuarioId) ?? [];
    arr.push(roleName);
    rolesByUser.set(ur.usuarioId, arr);
  }
  for (const [userId, roleNames] of rolesByUser.entries()) {
    const key = userRolesKey(userId);
    await redis.del(key);
    if (roleNames.length) await redis.sadd(key, ...roleNames);
  }

  console.log('✅ Redis RBAC sincronizado.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });
