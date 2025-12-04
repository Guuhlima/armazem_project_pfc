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

export async function updateUserGlobalRole(
  req: FastifyRequest<{
    Params: { userId: string };
    Body: { roleId: number | null };
  }>,
  reply: FastifyReply
) {
  try {
    const { userId } = req.params;
    const uid = Number(userId);

    const { roleId } = req.body;

    await prisma.$transaction(async (tx) => {
      await tx.usuarioRole.deleteMany({ where: { usuarioId: uid } });

      if (roleId !== null) {
        const exists = await tx.role.findUnique({
          where: { id: roleId },
        });

        if (!exists) {
          throw new Error("INVALID_ROLE_ID");
        }

        await tx.usuarioRole.create({
          data: {
            usuarioId: uid,
            roleId,
          },
        });
      }

      const estoques = await tx.usuarioEstoque.findMany({
        where: { usuarioId: uid },
      });

      for (const e of estoques) {
        await tx.usuarioEstoque.update({
          where: {
            usuarioId_estoqueId: {
              usuarioId: uid,
              estoqueId: e.estoqueId,
            },
          },
          data: {
            roleId, // null → limpa
          },
        });
      }
    });

    return reply.send({
      ok: true,
      roleId,
      appliedToStocks: true,
    });

  } catch (err: any) {
    console.error(err);

    if (err.message === "INVALID_ROLE_ID") {
      return reply.status(400).send({
        error: "roleId inválido",
      });
    }

    return reply.status(500).send({
      error: "Erro interno ao atualizar papel global",
      message: err?.message,
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

