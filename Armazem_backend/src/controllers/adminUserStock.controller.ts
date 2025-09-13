import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma';

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