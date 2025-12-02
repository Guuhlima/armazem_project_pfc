import { FastifyReply, FastifyRequest } from 'fastify';
import { EquipamentoBodySchema, EquipamentoParamsSchema } from '../schemas/equipment.schema';
import { Static } from '@sinclair/typebox';
import { dateOnlyToUTC } from '../utils/utils';
import { prisma } from '../lib/prisma';

type Body = Static<typeof EquipamentoBodySchema>;
type Params = Static<typeof EquipamentoParamsSchema>;

// Cadastrar novos equipamentos
export async function cadastrarEquipamento(
  req: FastifyRequest<{ Body: Body }>,
  reply: FastifyReply
) {
  try {
    const { nome, quantidade, data, rastreioTipo } = req.body;

    const novoEquipamento = await prisma.equipamento.create({
      data: {
        nome,
        quantidade,
        data: new Date(data),
        rastreioTipo: rastreioTipo ?? 'NONE',
      },
    });

    reply.send({
      id: novoEquipamento.id,
      nome: novoEquipamento.nome,
      quantidade: novoEquipamento.quantidade,
      rastreioTipo: novoEquipamento.rastreioTipo,
    });
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Erro ao cadastrar equipamento' });
  }
}

// Listar equipamentos e vincular do armazem diretamente
export async function listarEquipamentos(req: FastifyRequest, reply: FastifyReply) {
  try {
    const itens = await prisma.equipamento.findMany({
      orderBy: { nome: 'asc' },
    });

    const payload = itens.map(it => ({
      id: it.id,
      nome: it.nome ?? null,
      data: it.data ?? null,
      rastreioTipo: it.rastreioTipo,
    }));

    reply.send(payload);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: 'Erro ao buscar equipamentos' });
  }
}

// Visualizar todos equipamentos (Refletido pelo warehouse)
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

// Visualizar equipamentos por ID
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

// Editar equipamentos
export async function editarEquipamento(
  req: FastifyRequest<{
    Body: {
      nome?: string;
      quantidade?: number;
      data?: string | null;
      rastreioTipo?: 'NONE' | 'LOTE' | 'SERIAL';
    };
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = req.params;
    const { nome, quantidade, data, rastreioTipo } = req.body;

    const equipamentoId = Number(id);

    const equipamentoAtual = await prisma.equipamento.findUnique({
      where: { id: equipamentoId },
    });

    if (!equipamentoAtual) {
      return reply.status(404).send({ error: 'Equipamento não encontrado' });
    }

    const quantidadeNova =
      typeof quantidade === 'number'
        ? quantidade
        : equipamentoAtual.quantidade ?? 0;

    const dataEdit = data != null ? dateOnlyToUTC(data) : undefined;

    const [equipamentoEditado] = await prisma.$transaction([
      prisma.equipamento.update({
        where: { id: equipamentoId },
        data: {
          nome,
          quantidade: quantidadeNova,
          data: dataEdit,
          rastreioTipo: rastreioTipo ?? equipamentoAtual.rastreioTipo,
        },
      }),

      prisma.estoqueItem.updateMany({
        where: { itemId: equipamentoId },
        data: {
          quantidade: quantidadeNova,
        },
      }),
    ]);

    return reply.send(equipamentoEditado);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return reply.status(404).send({ error: 'Equipamento não encontrado' });
    }

    console.error(error);
    return reply.status(500).send({ error: 'Erro ao editar equipamento' });
  }
}

// Deletar um equipamento
export async function deletarEquipamento(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const id = Number(req.params.id);
  try {
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