import { FastifyReply, FastifyRequest } from 'fastify';
import { EquipamentoBodySchema, EquipamentoParamsSchema } from '../schemas/equipment.schema';
import { Static } from '@sinclair/typebox';
import { dateOnlyToUTC } from '../utils/utils';
import { prisma } from '../lib/prisma';

type Body = Static<typeof EquipamentoBodySchema>;
type Params = Static<typeof EquipamentoParamsSchema>;

export async function cadastrarEquipamento(
  req: FastifyRequest<{ Body: Body }>,
  reply: FastifyReply
) {
  try {
    const { nome, quantidade, data } = req.body;

    const novoEquipamento = await prisma.equipamento.create({
      data: {
        nome,
        quantidade,
        data: new Date(data),
      },
    });

    reply.send({
      id: novoEquipamento.id,
      nome: novoEquipamento.nome,
      quantidade: novoEquipamento.quantidade,
    });
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Erro ao cadastrar equipamento' });
  }
}

export async function visualizarEquipamentos(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { warehouses } = (req.query ?? {}) as { warehouses?: string | string[] };

    const ids = Array.isArray(warehouses)
      ? warehouses.flatMap(s => `${s}`.split(','))
      : (warehouses ?? '').split(',');
    const estoqueIds = ids.map(Number).filter(n => Number.isFinite(n));

    const where = estoqueIds.length ? { estoqueId: { in: estoqueIds } } : {};

    const itens = await prisma.estoqueItem.findMany({
      where,
      include: {
        item: true,
        estoque: false,
      },
      orderBy: [
        { estoqueId: 'asc' },
        { itemId: 'asc' },
      ],
    });

    const payload = itens.map(it => ({
      id: it.item.id,
      nome: it.item.nome ?? null,
      quantidade: it.quantidade,
      data: it.item.data ?? null,
      warehouseId: it.estoqueId,
      rastreioTipo: it.item.rastreioTipo,
    }));

    reply.send(payload);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Erro ao buscar equipamentos' });
  }
}

export async function visualizarEquipamentosPorId(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  try {
    const { id } = req.params;

    const equipamento = await prisma.equipamento.findUnique({
      where: { id: parseInt(id) },
    });

    if (!equipamento) {
      reply.status(404).send({ error: 'Equipamento não encontrado' });
      return;
    }

    reply.send(equipamento);
  } catch (error) {
    reply.status(500).send({ error: 'Erro ao buscar equipamento' });
    console.error(error);
  }
}

export async function editarEquipamento(
  req: FastifyRequest<{ Body: { nome?: string; quantidade?: number; data?: string | null }; Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = req.params;
    const { nome, quantidade, data } = req.body;

    const equipamentoEditado = await prisma.equipamento.update({
      where: { id: Number(id) },
      data: {
        nome,
        quantidade,
        data: data != null ? dateOnlyToUTC(data) : undefined,
      },
    });

    reply.send(equipamentoEditado);
  } catch (error: any) {
    if (error.code === 'P2025') {
      reply.status(404).send({ error: 'Equipamento não encontrado' });
    } else {
      console.error(error);
      reply.status(500).send({ error: 'Erro ao editar equipamento' });
    }
  }
}

export async function deletarEquipamento(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const id = Number(req.params.id);
  try {
    // 1) Verifica histórico (NÃO apagar)
    const [qMov, qTransf] = await Promise.all([
      prisma.movEstoque.count({ where: { itemId: id } }),
      prisma.transferencia.count({ where: { itemId: id } }),
    ]);

    if (qMov > 0 || qTransf > 0) {
      return reply.status(409).send({
        error: 'CONSTRAINT_VIOLATION',
        message: 'Não é possível excluir: há histórico (movimentos/transferências). Arquive o item.',
      });
    }

    // 2) Apaga dependências permitidas e depois o item
    const deleted = await prisma.$transaction(async (tx) => {
      await tx.alertaEstoque.deleteMany({ where: { itemId: id } });
      await tx.contagemCiclicaTarefa.deleteMany({ where: { itemId: id } });
      await tx.transferenciaAgendada.deleteMany({ where: { itemId: id } });
      await tx.serial.deleteMany({ where: { itemId: id } });
      await tx.lote.deleteMany({ where: { itemId: id } });
      await tx.estoqueItem.deleteMany({ where: { itemId: id } });

      return tx.equipamento.delete({ where: { id } });
    });

    reply.send(deleted);
  } catch (error: any) {
    if (error.code === 'P2003') {
      return reply.status(409).send({
        error: 'CONSTRAINT_VIOLATION',
        message: 'Ainda há vínculos impedindo a exclusão.',
      });
    }
    if (error.code === 'P2025') return reply.status(404).send({ error: 'Equipamento não encontrado' });
    console.error(error);
    reply.status(500).send({ error: 'Erro ao deletar equipamento' });
  }
}