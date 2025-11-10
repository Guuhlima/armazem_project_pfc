import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma';

// Papel do usuário no estoque (por roleId + roleName)
export async function getUserStockRole(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { userId, estoqueId } = req.params as { userId: string; estoqueId: string };
    const uid = Number(userId);
    const eid = Number(estoqueId);

    const row = await prisma.usuarioEstoque.findUnique({
      where: { usuarioId_estoqueId: { usuarioId: uid, estoqueId: eid } },
      select: { roleId: true, roleRef: { select: { id: true, nome: true } } },
    });

    if (row?.roleId && row.roleRef) {
      return reply.send({
        roleId: row.roleRef.id,
        roleName: row.roleRef.nome,
        inherited: false,
      });
    }

    const superAdmin = await prisma.usuarioRole.findFirst({
      where: { usuarioId: uid, role: { nome: 'SUPER-ADMIN' } },
      select: { role: { select: { id: true, nome: true } } },
    });

    if (superAdmin?.role) {
      return reply.send({
        roleId: superAdmin.role.id,
        roleName: superAdmin.role.nome,
        inherited: true,
      });
    }

    return reply.send({ roleId: null, roleName: null, inherited: false });
  } catch (error) {
    console.error('Erro ao obter papel do usuário no estoque:', error);
    return reply.status(500).send({
      error: 'Erro interno ao obter papel do usuário no estoque',
      message: (error as Error).message,
    });
  }
}

// Define papel por estoque via { roleId }
export async function updateUserStockRole(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { userId, estoqueId } = req.params as { userId: string; estoqueId: string };
    const uid = Number(userId);
    const eid = Number(estoqueId);

    const { roleId } = (req.body ?? {}) as { roleId?: number | null };

    if (roleId === null || typeof roleId === 'undefined') {
      await prisma.usuarioEstoque.upsert({
        where: { usuarioId_estoqueId: { usuarioId: uid, estoqueId: eid } },
        update: { roleId: null },
        create: { usuarioId: uid, estoqueId: eid, roleId: null },
      });
      return reply.send({ ok: true, cleared: true });
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, nome: true },
    });
    if (!role) {
      return reply.code(400).send({ error: 'roleId inválido' });
    }

    await prisma.usuarioEstoque.upsert({
      where: { usuarioId_estoqueId: { usuarioId: uid, estoqueId: eid } },
      update: { roleId: role.id },
      create: { usuarioId: uid, estoqueId: eid, roleId: role.id },
    });

    return reply.send({ ok: true, roleId: role.id, roleName: role.nome });
  } catch (error) {
    console.error('Erro ao atualizar papel do usuário no estoque:', error);
    return reply.status(500).send({
      error: 'Erro interno ao atualizar papel do usuário no estoque',
      message: (error as Error).message,
    });
  }
}

// Lista estoques do usuário + roleId/roleName
export async function listUserStocks(
  req: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply
) {
  try {
    const uid = Number(req.params.userId);

    const vinculos = await prisma.usuarioEstoque.findMany({
      where: { usuarioId: uid },
      select: {
        estoqueId: true,
        roleId: true,
        roleRef: { select: { id: true, nome: true } },
        estoque: { select: { id: true, nome: true } },
      },
      orderBy: { estoqueId: 'asc' },
    });

    const items = vinculos.map(v => ({
      id: v.estoque.id,
      nome: v.estoque.nome,
      roleId: v.roleRef?.id ?? null,
      roleName: v.roleRef?.nome ?? null,
    }));

    return reply.send({ items });
  } catch (error) {
    console.error('Erro ao listar estoques do usuário:', error);
    return reply.status(500).send({
      error: 'Erro interno ao listar estoques do usuário',
      message: (error as Error).message,
    });
  }
}

// Catálogo de roles (para o Select por ID no front)
export async function listRoles(req: FastifyRequest, reply: FastifyReply) {
  try {
    const roles = await prisma.role.findMany({
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });

    return reply.send({ items: roles });
  } catch (error) {
    console.error('Erro ao listar roles:', error);
    return reply.status(500).send({
      error: 'Erro interno ao listar roles',
      message: (error as Error).message,
    });
  }
}
