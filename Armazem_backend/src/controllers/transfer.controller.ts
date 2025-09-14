import { FastifyRequest, FastifyReply } from 'fastify';
import { Static } from '@sinclair/typebox';
import {
  TransferenciaBodySchema,
  TransferenciaParamsSchema
} from '../schemas/transfer.schema';
import { prisma } from '../lib/prisma';

type Body = Static<typeof TransferenciaBodySchema>;
type Params = Static<typeof TransferenciaParamsSchema>;

// ABAIXO FEATURE DE REALIZAR TRANSFERENCIA ENTRE ESTOQUES DEBITANDO DE UM ESTOQUE E ACRESCENTANDO O VALOR EM OUTRO JUNTO COM O EQUIPAMENTO 

export async function realizarTransferencia(
  req: FastifyRequest<{ Body: Body }>,
  reply: FastifyReply
) {
  try {
    const { itemId, estoqueOrigemId, estoqueDestinoId, quantidade } = req.body;
    const usuarioId = Number((req.user as any)?.id);

    if (!usuarioId) {
      return reply.status(401).send({ error: 'Não autenticado' });
    }
    if (estoqueOrigemId === estoqueDestinoId) {
      return reply.status(400).send({ error: 'Estoques de origem e destino devem ser diferentes' });
    }
    if (quantidade <= 0) {
      return reply.status(400).send({ error: 'Quantidade deve ser maior que zero' });
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.estoqueItem.updateMany({
        where: { itemId, estoqueId: estoqueOrigemId, quantidade: { gte: quantidade } },
        data: { quantidade: { decrement: quantidade } },
      });

      if (updated.count === 0) {
        throw new Error('Quantidade insuficiente no estoque de origem');
      }

      await tx.estoqueItem.upsert({
        where: { itemId_estoqueId: { itemId, estoqueId: estoqueDestinoId } },
        update: { quantidade: { increment: quantidade } },
        create: { itemId, estoqueId: estoqueDestinoId, quantidade },
      });

      await tx.transferencia.create({
        data: {
          itemId,
          estoqueOrigemId,
          estoqueDestinoId,
          quantidade,
          usuarioId, 
        },
      });
    }, { isolationLevel: 'Serializable' });

    return reply.send({ ok: true, message: 'Transferência realizada com sucesso' });
  } catch (error: any) {
    console.error(error);
    if (error.message?.includes('insuficiente')) {
      return reply.status(400).send({ error: error.message });
    }
    return reply.status(500).send({ error: 'Erro ao realizar transferência' });
  }
}

export async function visualizarTransferencias(_: FastifyRequest, reply: FastifyReply) {
  try {
    const transferencias = await prisma.transferencia.findMany();
    reply.send(transferencias);
  } catch (error) {
    reply.status(500).send({ error: 'Erro ao listar transferências' });
    console.error(error);
  }
}

export async function visualizarTransferenciaPorId(
  req: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(req.params.id);

    const transferencia = await prisma.transferencia.findUnique({
      where: { id },
    });

    if (!transferencia) {
      return reply.status(404).send({ error: 'Transferência não encontrada' });
    }

    reply.send(transferencia);
  } catch (error) {
    reply.status(500).send({ error: 'Erro ao consultar transferência' });
    console.error(error);
  }
}

export async function deletarTransferencia(
  req: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(req.params.id);

    await prisma.transferencia.delete({ where: { id } });

    reply.send('Transferência deletada com sucesso');
  } catch (error: any) {
    if (error.code === 'P2025') {
      reply.status(404).send({ error: 'Transferência não encontrada' });
    } else {
      reply.status(500).send({ error: 'Erro ao deletar transferência' });
      console.error(error);
    }
  }
}
