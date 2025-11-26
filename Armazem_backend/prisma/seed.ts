// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // 1) Permissions (granulares)
  const permissions = [
    { code: "equipment:read", desc: "Ler equipamentos" },
    { code: "equipment:manage", desc: "Criar/editar/excluir equipamentos" },
    { code: "transfer:manage", desc: "Gerenciar transferências" },
    { code: "user:manage", desc: "Gerenciar usuários" },
    { code: "user:delete", desc: "Deletar usuários" },
    { code: "stock:read", desc: "Ler estoques" },
    { code: "stock:manage", desc: "Gerenciar Estoques" },
    { code: "count:read", desc: "Ler tarefas de contagem cíclica" },
    { code: "count:start", desc: "Iniciar contagem cíclica" },
    { code: "count:input", desc: "Lançar contagem/reconte" },
    { code: "count:cancel", desc: "Cancelar tarefa de contagem" },
    { code: "count:generate", desc: "Gerar tarefas de contagem (cron/manual)" },
  ];
  await prisma.permission.createMany({
    data: permissions,
    skipDuplicates: true,
  });

  // 2) Roles (reaproveita a tabela "permissoes" via model Role)
  const roles = [
    { nome: "SUPER-ADMIN" },
    { nome: "ADMIN" },
    { nome: "USER-EQUIP-TRANSFER" },
    { nome: "USER-EQUIPAMENTOS" },
    { nome: "usuarioPadrão" },
  ];
  await prisma.role.createMany({ data: roles, skipDuplicates: true });

  // Helpers
  const allPerms = await prisma.permission.findMany();
  const permIdByCode = Object.fromEntries(allPerms.map((p) => [p.code, p.id]));

  const allRoles = await prisma.role.findMany();
  const roleIdByName = Object.fromEntries(allRoles.map((r) => [r.nome, r.id]));

  // 3) Grants Role -> Permission
  const grants: Record<string, string[]> = {
    "SUPER-ADMIN": [
      "equipment:read",
      "equipment:manage",
      "transfer:manage",
      "user:manage",
      "user:delete",
      "stock:read",
      "stock:manage",
      "count:read",
      "count:start",
      "count:input",
      "count:cancel",
      "count:generate",
    ],
    ADMIN: [
      "equipment:read",
      "equipment:manage",
      "transfer:manage",
      "user:manage",
      "user:delete",
      "stock:read",
      "stock:manage",
      "count:read",
      "count:start",
      "count:input",
      "count:cancel",
      "count:generate",
    ],
    "USER-EQUIP-TRANSFER": [
      "equipment:read",
      "transfer:manage",
      "stock:read",
      "count:read",
      "count:input",
    ],
    "USER-EQUIPAMENTOS": [
      "equipment:read",
      "stock:read",
    ],
    usuarioPadrão: [],
  };

  for (const [roleName, codes] of Object.entries(grants)) {
    const roleId = roleIdByName[roleName];
    if (!roleId) continue;
    for (const code of codes) {
      const permissionId = permIdByCode[code];
      await prisma.rolePerm.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  // 4) Usuários de exemplo (garante que existem, evita FK P2003)
  const adminHash = await bcrypt.hash("admin123", 10);
  const equipHash = await bcrypt.hash("equip123", 10);

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@local" },
    update: {},
    create: { email: "admin@local", nome: "Admin", senha: adminHash },
  });

  const equipUser = await prisma.usuario.upsert({
    where: { email: "equip@local" },
    update: {},
    create: { email: "equip@local", nome: "Equip User", senha: equipHash },
  });

  // 5) Vincular Roles aos usuários criados
  const superAdminRoleId = roleIdByName["SUPER-ADMIN"];
  const equipRoleId = roleIdByName["USER-EQUIPAMENTOS"];

  if (superAdminRoleId) {
    await prisma.usuarioRole.upsert({
      where: {
        usuarioId_roleId: { usuarioId: admin.id, roleId: superAdminRoleId },
      },
      update: {},
      create: { usuarioId: admin.id, roleId: superAdminRoleId },
    });
  }

  if (equipRoleId) {
    await prisma.usuarioRole.upsert({
      where: {
        usuarioId_roleId: { usuarioId: equipUser.id, roleId: equipRoleId },
      },
      update: {},
      create: { usuarioId: equipUser.id, roleId: equipRoleId },
    });
  }

  console.log(
    "✅ Seeds RBAC completas (permissions, roles, grants, usuários, vínculos)."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
