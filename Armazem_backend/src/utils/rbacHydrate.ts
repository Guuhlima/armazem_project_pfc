import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';

export async function hydrateRbacFromPrisma(app: FastifyInstance) {
  const { rbac } = app;

  const rolePerms = await prisma.rolePerm.findMany({
    include: { role: true, permission: true },
  });

  // Evitar duplicates (set local):
  const roleToPerms = new Map<string, Set<string>>();
  for (const rp of rolePerms) {
    const roleName = rp.role.nome;
    const permCode = rp.permission.code;
    if (!roleToPerms.has(roleName)) roleToPerms.set(roleName, new Set());
    roleToPerms.get(roleName)!.add(permCode);
  }

  for (const [roleName, set] of roleToPerms.entries()) {
    for (const perm of set) {
      await rbac.grantPermToRole(roleName, perm);
    }
  }

  // 3) User -> Roles
  const userRoles = await prisma.usuarioRole.findMany({
    include: { role: true },
  });

  const userToRoles = new Map<number, Set<string>>();
  for (const ur of userRoles) {
    if (!userToRoles.has(ur.usuarioId)) userToRoles.set(ur.usuarioId, new Set());
    userToRoles.get(ur.usuarioId)!.add(ur.role.nome);
  }

  for (const [userId, set] of userToRoles.entries()) {
    for (const roleName of set) {
      await rbac.addRoleToUser(userId, roleName);
    }
  }

  app.log.info('✅ RBAC hidratado do Prisma para Redis');
}
