import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma';
import { Static, Type } from '@sinclair/typebox';
import { EstoqueItemBodySchema } from '../schemas/stockItens.schema';

type Body = Static<typeof EstoqueItemBodySchema>;

export async function adicionarItemAoEstoque(
  req: FastifyRequest<{ Params: { id: string }, Body: Body }>,
  reply: FastifyReply
) {
  try {
    const estoqueId = parseInt(req.params.id);
    const { itemId, quantidade } = req.body;

    const upsert = await prisma.estoqueItem.upsert({
      where: {
        itemId_estoqueId: {
          itemId,
          estoqueId
        }
      },
      update: {
        quantidade: { increment: quantidade }
      },
      create: {
        itemId,
        estoqueId,
        quantidade
      }
    });

    reply.send(upsert);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Erro ao adicionar item ao estoque' });
  }
}

export async function visualizarItensDoEstoque(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const estoqueId = parseInt(req.params.id);

    const itens = await prisma.estoqueItem.findMany({
      where: {
        estoqueId,
      },
      include: {
        item: true,
        estoque: true,
      },
    });

    return reply.send(itens);
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'Erro ao listar itens do estoque' });
  }
}

export async function visualizarQuantidadePorItemNoEstoque(
  req: FastifyRequest<{ Params: { estoqueId: string; itemId: string } }>,
  reply: FastifyReply
) {
  try {
    const estoqueId = parseInt(req.params.estoqueId);
    const itemId = parseInt(req.params.itemId);

    const registro = await prisma.estoqueItem.findUnique({
      where: {
        itemId_estoqueId: {
          itemId,
          estoqueId,
        },
      },
      select: {
        quantidade: true,
      },
    });

    return reply.send({ quantidade: registro?.quantidade ?? 0 });
  } catch (error) {
    console.error('Erro ao buscar quantidade', error);
    return reply.status(500).send({ error: 'Erro ao buscar quantidade' });
  }
}
