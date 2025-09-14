import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import {
  AgendamentoCreateBodyType,
  AgendamentoParamsType,
} from '../schemas/agendamento.schema';

function formatBr(dt: Date) {
  const s = dt.toLocaleString('sv-SE', { 
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).replace(' ', 'T');
  return s + '-03:00';
}

export async function createAgendamento(
  req: FastifyRequest<{ Body: AgendamentoCreateBodyType }>,
  reply: FastifyReply
) {
  const { itemId, estoqueOrigemId, estoqueDestinoId, quantidade, executarEm } = req.body;
  const usuarioId = Number((req.user as any)?.id);

  if (!usuarioId) return reply.status(401).send({ error: 'Não autenticado' });
  if (estoqueOrigemId === estoqueDestinoId) {
    return reply.status(400).send({ error: 'Estoques de origem e destino devem ser diferentes' });
  }
  if (quantidade <= 0) {
    return reply.status(400).send({ error: 'Quantidade deve ser maior que zero' });
  }

  const when = new Date(executarEm);
  if (isNaN(when.getTime()) || when.getTime() <= Date.now()) {
    return reply.status(400).send({ error: 'Data/hora deve ser futura (ISO 8601)' });
  }

  try {
    const ag = await prisma.transferenciaAgendada.create({
      data: {
        itemId,
        estoqueOrigemId,
        estoqueDestinoId,
        quantidade,
        usuarioId,
        executarEm: when,
        status: 'PENDING',
      },
    });
    return reply.code(201).send(ag);
  } catch (e) {
    req.log.error(e, 'Erro ao criar agendamento');
    return reply.status(500).send({ error: 'Erro ao criar agendamento' });
  }
}

export async function cancelAgendamento(
  req: FastifyRequest<{ Params: AgendamentoParamsType }>,
  reply: FastifyReply
) {
  const id = Number(req.params.id);
  try {
    const ag = await prisma.transferenciaAgendada.findUnique({ where: { id } });
    if (!ag) return reply.status(404).send({ error: 'Agendamento não encontrado' });
    if (ag.status !== 'PENDING') {
      return reply.status(409).send({ error: `Agendamento já está em ${ag.status}` });
    }
    await prisma.transferenciaAgendada.update({
      where: { id },
      data: { status: 'CANCELED' },
    });
    return reply.send({ ok: true });
  } catch (e) {
    req.log.error(e, 'Erro ao cancelar agendamento');
    return reply.status(500).send({ error: 'Erro ao cancelar agendamento' });
  }
}

export async function listAgendamentos(_req: FastifyRequest, reply: FastifyReply) {
  try {
    const list = await prisma.transferenciaAgendada.findMany({
      orderBy: { executarEm: 'asc' },
    });
    return reply.send(list);
  } catch (e) {
    return reply.status(500).send({ error: 'Erro ao listar agendamentos' });
  }
}

export async function getAgendamentoById(
  req: FastifyRequest<{ Params: AgendamentoParamsType }>,
  reply: FastifyReply
) {
  const id = Number(req.params.id);
  try {
    const ag = await prisma.transferenciaAgendada.findUnique({ where: { id } });
    if (!ag) return reply.status(404).send({ error: 'Agendamento não encontrado' });
    return reply.send(ag);
  } catch (e) {
    return reply.status(500).send({ error: 'Erro ao consultar agendamento' });
  }
}
