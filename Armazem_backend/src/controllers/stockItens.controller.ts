// controllers/stockItens.controller.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma';
import { Static } from '@sinclair/typebox';
import { EstoqueItemBodySchema } from '../schemas/stockItens.schema';
import { checarLimitesEGerenciarAlertas } from '../service/estoque-alertas.service';

type Body = Static<typeof EstoqueItemBodySchema>;

export async function adicionarItemAoEstoque(
  req: FastifyRequest<{ Params: { id: string }, Body: Body }>,
  reply: FastifyReply
) {
  try {
    const estoqueId = Number(req.params.id);
    const { itemId, quantidade, minimo } = req.body;

    if (!Number.isInteger(estoqueId) || estoqueId <= 0) {
      return reply.status(400).send({ error: 'estoqueId inválido' });
    }
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return reply.status(400).send({ error: 'itemId inválido' });
    }
    if (typeof quantidade !== 'number' || quantidade <= 0) {
      return reply.status(400).send({ error: 'Quantidade deve ser maior que zero' });
    }

    const upsert = await prisma.estoqueItem.upsert({
      where: { itemId_estoqueId: { itemId, estoqueId } },
      update: {
        quantidade: { increment: quantidade },
        ...(typeof minimo === 'number' ? { minimo } : {}),
      },
      create: {
        itemId,
        estoqueId,
        quantidade,
        minimo: typeof minimo === 'number' ? minimo : undefined,
      },
      include: {
        item: true,
        estoque: true,
      },
    });

    await checarLimitesEGerenciarAlertas(estoqueId, itemId);

    return reply.send(upsert);
  } catch (error) {
    req.log?.error?.(error);
    return reply.status(500).send({ error: 'Erro ao adicionar item ao estoque' });
  }
}

//Lista os registros estoqueItem (inclui item/estoque).
export async function visualizarItensDoEstoque(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const estoqueId = Number(req.params.id);
    if (!Number.isInteger(estoqueId) || estoqueId <= 0) {
      return reply.status(400).send({ error: 'estoqueId inválido' });
    }

    const itens = await prisma.estoqueItem.findMany({
      where: { estoqueId },
      include: {
        item: true,
        estoque: true,
      },
      orderBy: [
        { item: { nome: 'asc' } },
        { itemId: 'asc' },
      ],
    });

    return reply.send(itens);
  } catch (error) {
    req.log?.error?.(error);
    return reply.status(500).send({ error: 'Erro ao listar itens do estoque' });
  }
}

// Retorna a quantidade do par (estoqueId, itemId) a partir de estoqueItem.
export async function visualizarQuantidadePorItemNoEstoque(
  req: FastifyRequest<{ Params: { estoqueId: string; itemId: string } }>,
  reply: FastifyReply
) {
  try {
    const estoqueId = Number(req.params.estoqueId);
    const itemId = Number(req.params.itemId);

    if (!Number.isInteger(estoqueId) || estoqueId <= 0) {
      return reply.status(400).send({ error: 'estoqueId inválido' });
    }
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return reply.status(400).send({ error: 'itemId inválido' });
    }

    const registro = await prisma.estoqueItem.findUnique({
      where: { itemId_estoqueId: { itemId, estoqueId } },
      select: { quantidade: true },
    });

    return reply.send({ quantidade: registro?.quantidade ?? 0 });
  } catch (error) {
    req.log?.error?.(error);
    return reply.status(500).send({ error: 'Erro ao buscar quantidade' });
  }
}
