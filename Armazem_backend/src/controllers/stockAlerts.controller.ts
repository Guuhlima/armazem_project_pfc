// src/controllers/estoque-alertas.controller.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma';

export async function listarItensAbaixoDoMinimo(
  req: FastifyRequest<{ Params: { estoqueId: string } }>,
  reply: FastifyReply
) {
  try {
    const estoqueId = parseInt(req.params.estoqueId);

    const itens = await prisma.estoqueItem.findMany({
      where: { estoqueId },
      include: { item: true },
    });

    const abaixo = itens.filter((e) => e.quantidade <= e.minimo);

    return reply.send(abaixo);
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'Erro ao listar itens abaixo do mínimo' });
  }
}

export async function listarAlertasAbertos(
  req: FastifyRequest<{ Params: { estoqueId: string } }>,
  reply: FastifyReply
) {
  try {
    const estoqueId = parseInt(req.params.estoqueId);
    const alertas = await prisma.alertaEstoque.findMany({
      where: { estoqueId, resolvido: false },
      orderBy: { createdAt: 'desc' },
      include: { estoqueItem: { include: { item: true } } },
    });

    return reply.send(alertas);
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'Erro ao listar alertas' });
  }
}
