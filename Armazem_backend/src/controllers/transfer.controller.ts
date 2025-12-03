import { FastifyRequest, FastifyReply } from 'fastify';
import { Static } from '@sinclair/typebox';
import { TransferenciaBodySchema, TransferenciaParamsSchema } from '../schemas/transfer.schema';
import { prisma } from '../lib/prisma';
import { TelegramService } from '../service/telegram.service';
import { checarLimitesEGerenciarAlertas } from '../service/estoque-alertas.service';
import * as inv from '../service/estoque.service';

type Body = Static<typeof TransferenciaBodySchema>;
type Params = Static<typeof TransferenciaParamsSchema>;

export async function realizarTransferencia(
  req: FastifyRequest<{ Body: Body }>,
  reply: FastifyReply
) {
  try {
    const {
      itemId,
      estoqueOrigemId,
      estoqueDestinoId,
      quantidade,
      loteCodigo,
      serialNumero,
      referencia
    } = req.body;

    const rawUser = req.user as any;

    const usuarioId = Number(rawUser?.sub);
    const usuarioNome = rawUser?.nome ?? `user#${usuarioId}`;
    const usuarioEmail = rawUser?.email ?? null;

    if (!usuarioId) return reply.status(401).send({ error: 'Não autenticado' });
    if (estoqueOrigemId === estoqueDestinoId) {
      return reply
        .status(400)
        .send({ error: 'Estoques de origem e destino devem ser diferentes' });
    }
    if (quantidade <= 0) {
      return reply.status(400).send({ error: 'Quantidade deve ser maior que zero' });
    }

    let createdTransferId: number | null = null;
    let quando: Date | null = null;
    let itemNome: string | null = null;

    let loteId: number | null = null;
    let serialId: number | null = null;

    if (loteCodigo) {
      const lote = await prisma.lote.findFirst({ where: { itemId, codigo: loteCodigo } });
      if (!lote)
        return reply
          .status(400)
          .send({ error: `Lote ${loteCodigo} não encontrado para o item ${itemId}` });
      loteId = lote.id;
    }

    if (serialNumero) {
      const serial = await prisma.serial.findUnique({ where: { numero: serialNumero } });
      if (!serial || serial.itemId !== itemId)
        return reply
          .status(400)
          .send({ error: `Serial ${serialNumero} não encontrado para o item ${itemId}` });
      serialId = serial.id;
    }

    await prisma.$transaction(
      async (tx) => {
        const item = await tx.equipamento.findUnique({
          where: { id: itemId },
          select: { nome: true },
        });
        itemNome = item?.nome ?? `Item#${itemId}`;

        console.log('[DEBUG req.user]', req.user);
        console.log('[DEBUG usuarioNome montado]', usuarioNome);

        await inv.transferir({
          itemId,
          quantidade,
          origemId: estoqueOrigemId,
          destinoId: estoqueDestinoId,
          loteId: loteId ?? undefined,
          serialId: serialId ?? undefined,
          referencia: {
            tabela: referencia?.tabela ?? 'transferencia',
            id: referencia?.id ?? undefined,
          },
          usuario: {
            id: usuarioId,
            nome: usuarioNome,
            email: usuarioEmail,
          },
        });
        
        const created = await tx.transferencia.create({
          data: {
            itemId,
            estoqueOrigemId,
            estoqueDestinoId,
            quantidade,
            usuarioId,
          },
          select: { id: true, dataTransferencia: true },
        });

        createdTransferId = created.id;
        quando = created.dataTransferencia ?? new Date();
      },
      { isolationLevel: 'Serializable' }
    );

    try {
      await TelegramService.sendTransferNotification({
        estoqueOrigemId,
        estoqueDestinoId,
        itemNome: itemNome ?? `Item#${itemId}`,
        quantidade,
        usuario: usuarioNome,
        transferenciaId: createdTransferId!,
        quando: quando!,
      });
    } catch (e) {
      req.log?.warn?.({ err: e }, '[telegram] falha ao notificar transferência');
    }

    await Promise.allSettled([
      checarLimitesEGerenciarAlertas(estoqueOrigemId, itemId),
      checarLimitesEGerenciarAlertas(estoqueDestinoId, itemId),
    ]);

    return reply.send({
      ok: true,
      message: 'Transferência realizada com sucesso',
      transferenciaId: createdTransferId,
      itemNome,
      quando,
    });
  } catch (error: any) {
    req.log?.error?.(error);
    const msg = error?.message ?? '';
    if (
      msg.includes('Saldo insuficiente') ||
      msg.includes('Item exige') ||
      msg.includes('não é SERIAL') ||
      msg.includes('vencido')
    ) {
      return reply.status(400).send({ error: msg });
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
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: 'ID inválido' });
    }

    const usuarioId = Number((req.user as any)?.id);
    const usuarioNome = (req.user as any)?.nome ?? `user#${usuarioId}`;
    const usuarioEmail =
      (req.user as any)?.email;

    if (!usuarioId) {
      return reply.status(401).send({ error: 'Não autenticado' });
    }

    const transferencia = await prisma.transferencia.findUnique({
      where: { id },
    });

    if (!transferencia) {
      return reply.status(404).send({ error: 'Transferência não encontrada' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.transferencia.delete({ where: { id } });
    });

    return reply.send('Transferência deletada com sucesso');
  } catch (error: any) {
    console.error(error);

    if (error.code === 'P2025') {
      return reply.status(404).send({ error: 'Transferência não encontrada' });
    }

    return reply.status(500).send({ error: 'Erro ao deletar transferência' });
  }
}
