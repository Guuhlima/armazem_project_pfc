import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma';

// Obter permissão do usuario em um estoque
// Se for SUPER-ADMIN, retorna ADMIN Herdado
export async function getUserStockRole(req: FastifyRequest, reply: FastifyReply) {
  const { userId, estoqueId } = req.params as { userId: string; estoqueId: string };

  const row = await prisma.usuarioEstoque.findUnique({
    where: { usuarioId_estoqueId: { usuarioId: Number(userId), estoqueId: Number(estoqueId) } },
    select: { role: true },
  });

  if (row?.role) {
    return reply.send({ role: row.role, inherited: false });
  }

  const superAdmin = await prisma.usuarioRole.findFirst({
    where: {
      usuarioId: Number(userId),
      role: { nome: "SUPER-ADMIN" },
    },
    select: { usuarioId: true },
  });

  if (superAdmin) {
    return reply.send({ role: "ADMIN", inherited: true });
  }

  return reply.send({ role: null });
}

// Atualizar permissão de usuario no estoque
export async function updateUserStockRole(req: FastifyRequest, reply: FastifyReply) {
  const { userId, estoqueId } = req.params as { userId: string; estoqueId: string };
  const { role } = (req.body ?? {}) as { role?: "ADMIN" | "MEMBER" };

  if (role !== "ADMIN" && role !== "MEMBER") {
    return reply.code(400).send({ error: "role inválido" });
  }

  await prisma.usuarioEstoque.upsert({
    where: { usuarioId_estoqueId: { usuarioId: Number(userId), estoqueId: Number(estoqueId) } },
    create: { usuarioId: Number(userId), estoqueId: Number(estoqueId), role },
    update: { role },
  });

  return reply.send({ ok: true });
}

// Listar estoque vinculados a um usuario
export async function listUserStocks(
  req: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply
) {
  const userId = Number(req.params.userId);

  try {
    const vinculos = await prisma.usuarioEstoque.findMany({
      where: { usuarioId: userId },
      select: {
        estoqueId: true,
        role: true,
        estoque: { select: { id: true, nome: true } },
      },
      orderBy: { estoqueId: 'asc' },
    });

    const items = vinculos.map(v => ({
      id: v.estoque.id,
      nome: v.estoque.nome,
      role: v.role,
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