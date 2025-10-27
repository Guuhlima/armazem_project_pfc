// tests/utils/dbTestHelpers.ts
import { prisma } from '../../src/lib/prisma';
import bcrypt from 'bcrypt';

export async function resetDb() {
  // apague primeiro pivôs e dependentes
  await prisma.usuarioRole.deleteMany();
  await prisma.rolePerm.deleteMany();
  await prisma.permissaoOnRoute.deleteMany().catch(() => {}); // se usar
  await prisma.permission.deleteMany();
  await prisma.route.deleteMany().catch(() => {});
  await prisma.role.deleteMany();
  await prisma.usuarioEstoque.deleteMany().catch(() => {});
  await prisma.stockAccessRequest.deleteMany().catch(() => {});
  await prisma.estoqueTelegramNotify.deleteMany().catch(() => {});
  await prisma.notificacao.deleteMany().catch(() => {});
  await prisma.passwordResetToken.deleteMany().catch(() => {});
  await prisma.transferenciaAgendada.deleteMany().catch(() => {});
  await prisma.transferencia.deleteMany().catch(() => {});
  await prisma.estoqueItem.deleteMany().catch(() => {});
  await prisma.equipamento.deleteMany().catch(() => {});
  await prisma.estoque.deleteMany().catch(() => {});
  await prisma.ciente_cookies.deleteMany().catch(() => {});
  await prisma.usuario.deleteMany();
}

export async function seedRBAC() {
  // 1) Permissions
  await prisma.permission.createMany({
    data: [{ code: 'user:manage' }, { code: 'user:delete' }],
    skipDuplicates: true,
  });

  // 2) Role
  const role =
    (await prisma.role.findUnique({ where: { nome: 'ADMIN' } })) ||
    (await prisma.role.create({ data: { nome: 'ADMIN' } }));

  const perms = await prisma.permission.findMany({
    where: { code: { in: ['user:manage', 'user:delete'] } },
  });

  // 3) RolePerm (vínculo)
  for (const p of perms) {
    await prisma.rolePerm.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
      update: {},
      create: { roleId: role.id, permissionId: p.id },
    });
  }

  return role;
}

export async function criarUsuarioComRoles(
  { email, senha, nome = 'Admin' }: { email: string; senha: string; nome?: string; },
  roleNomes: string[] = ['ADMIN']
) {
  const hash = await bcrypt.hash(senha, 10);
  const user = await prisma.usuario.create({
    data: { email, nome, senha: hash },
  });

  const roles = await prisma.role.findMany({ where: { nome: { in: roleNomes } } });
  for (const r of roles) {
    await prisma.usuarioRole.create({
      data: { usuarioId: user.id, roleId: r.id },
    });
  }

  return user;
}
