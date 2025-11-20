import { FastifyRequest, FastifyReply } from 'fastify';
import { Static } from '@sinclair/typebox';
import { RecebimentoBodySchema } from '../schemas/recebimento.schema';
import * as inv from '../service/estoque.service';
import { checarLimitesEGerenciarAlertas } from '../service/estoque-alertas.service';
import { prisma } from '../lib/prisma';

type Body = Static<typeof RecebimentoBodySchema>;

// Receber novos equipamentos ao armazem
export async function receberEquipamento(
  req: FastifyRequest<{ Body: Body }>,
  reply: FastifyReply
) {
  try {
    let {
      estoqueId,
      itemId,
      quantidade,
      loteCodigo,
      validade,
      serialNumero,
      referencia,
    } = req.body;

    if (quantidade <= 0) {
      return reply.status(400).send({ error: 'Quantidade deve ser maior que zero' });
    }

    const item = await prisma.equipamento.findUnique({
      where: { id: itemId },
      select: { rastreioTipo: true, nome: true },
    });
    if (!item) return reply.status(404).send({ error: `Item ${itemId} não encontrado` });
    if (item.rastreioTipo === 'SERIAL' && quantidade !== 1) {
      return reply.status(400).send({ error: 'Itens SERIAL devem ser recebidos com quantidade = 1' });
    }

    if (typeof validade === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(validade)) {
      // validade = new Date(`${validade}T00:00:00`);
    }

    await inv.receber({
      estoqueId,
      itemId,
      quantidade,
      loteCodigo,
      validade,
      serialNumero,
      referencia: {
        tabela: referencia?.tabela ?? 'recebimento',
        id: referencia?.id,
      },
    });

    let lote: { id: number; codigo: string; validade: Date | null } | null = null;
    let serial: { id: number; numero: string; loteId: number | null } | null = null;

    if (loteCodigo) {
      lote = await prisma.lote.findFirst({
        where: { itemId, codigo: loteCodigo },
        select: { id: true, codigo: true, validade: true },
      });
    }
    if (serialNumero) {
      serial = await prisma.serial.findUnique({
        where: { numero: serialNumero },
        select: { id: true, numero: true, loteId: true },
      });
    }

    await checarLimitesEGerenciarAlertas(estoqueId, itemId).catch(() => {});

    const saldoLotes = await inv.saldoPorLote(itemId, estoqueId).catch(() => []);

    req.log.info({
      action: 'recebimento_ok',
      estoqueId, itemId, quantidade, loteCodigo, serialNumero,
      loteId: lote?.id, serialId: serial?.id
    });

    return reply.send({
      ok: true,
      message: 'Recebimento lançado com sucesso',
      estoqueId,
      itemId,
      quantidade,
      itemRastreio: item.rastreioTipo,
      lote: lote ? { id: lote.id, codigo: lote.codigo, validade: lote.validade } : null,
      serial: serial ? { id: serial.id, numero: serial.numero, loteId: serial.loteId } : null,
      saldoPorLote: saldoLotes,
    });
  } catch (error: any) {
    req.log?.error?.(error);
    const msg = error?.message ?? '';
    if (
      msg.includes('obrigatório') ||
      msg.includes('não encontrado') ||
      msg.includes('não usa lote/serial') ||
      msg.includes('exige') ||
      msg.includes('vencido') ||
      msg.includes('deve ser')
    ) {
      return reply.status(400).send({ error: msg });
    }
    return reply.status(500).send({ error: 'Erro ao lançar recebimento' });
  }
}