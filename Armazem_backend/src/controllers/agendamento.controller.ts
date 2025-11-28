import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import {
  AgendamentoCreateBodyType,
  AgendamentoParamsType,
} from '../schemas/agendamento.schema';
import { TelegramService } from '../service/telegram.service';
import { executarAgendamento, executarPendentes, autoReposicaoAutomatica } from "../service/agendamento.service";

// Criar angedamento de transferencia futuras (validando dados e notifica)
export async function createAgendamento(
  req: FastifyRequest<{ Body: AgendamentoCreateBodyType }>,
  reply: FastifyReply
) {
  const { itemId, estoqueOrigemId, estoqueDestinoId, quantidade, executarEm } = req.body;
  const usuarioId = Number((req.user as any)?.id);
  const usuarioNome = (req.user as any)?.nome ?? `user#${usuarioId}`;

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
    const [ag, item] = await Promise.all([
      prisma.transferenciaAgendada.create({
        data: {
          itemId,
          estoqueOrigemId,
          estoqueDestinoId,
          quantidade,
          usuarioId,
          executarEm: when,
          status: 'PENDING',
          origemTipo: 'MANUAL',
          motivo: 'SOLICITACAO_MANUAL',
        },
      }),
      prisma.equipamento.findUnique({
        where: { id: itemId },
        select: { nome: true },
      }),
    ]);

    const itemNome = (item?.nome ?? '').trim() || `Item#${itemId}`;

    try {
      await TelegramService.sendAgendamentoCreatedNotification({
        agendamentoId: ag.id,
        itemNome,
        quantidade: ag.quantidade,
        estoqueOrigemId: ag.estoqueOrigemId,
        estoqueDestinoId: ag.estoqueDestinoId,
        executarEm: ag.executarEm,
        usuario: usuarioNome,
      });
    } catch (e) {
      req.log?.warn?.({ err: e }, '[telegram] falha ao notificar criação de agendamento');
    }

    return reply.code(201).send(ag);
  } catch (e) {
    req.log.error(e, 'Erro ao criar agendamento');
    return reply.status(500).send({ error: 'Erro ao criar agendamento' });
  }
}

// Cancelar agendamento pendete
export async function cancelAgendamento(
  req: FastifyRequest<{ Params: AgendamentoParamsType }>,
  reply: FastifyReply
) {
  const id = Number(req.params.id);
  const usuarioId = Number((req.user as any)?.id);
  const usuarioNome = (req.user as any)?.nome ?? `user#${usuarioId}`;

  try {
    const ag = await prisma.transferenciaAgendada.findUnique({ where: { id } });
    if (!ag) return reply.status(404).send({ error: 'Agendamento não encontrado' });
    if (ag.status !== 'PENDING') {
      return reply.status(409).send({ error: `Agendamento já está em ${ag.status}` });
    }

    const [updated, item] = await Promise.all([
      prisma.transferenciaAgendada.update({
        where: { id },
        data: { status: 'CANCELED' },
      }),
      prisma.equipamento.findUnique({
        where: { id: ag.itemId },
        select: { nome: true },
      }),
    ]);

    try {
      await TelegramService.sendAgendamentoCanceledNotification({
        agendamentoId: updated.id,
        itemNome: (item?.nome ?? '').trim() || `Item#${ag.itemId}`,
        quantidade: ag.quantidade,
        estoqueOrigemId: ag.estoqueOrigemId,
        estoqueDestinoId: ag.estoqueDestinoId,
        executarEm: ag.executarEm,
        usuario: usuarioNome,
      });
    } catch (e) {
      req.log?.warn?.({ err: e }, '[telegram] falha ao notificar cancelamento de agendamento');
    }

    return reply.send({ ok: true });
  } catch (e) {
    req.log.error(e, 'Erro ao cancelar agendamento');
    return reply.status(500).send({ error: 'Erro ao cancelar agendamento' });
  }
}

// Listar todos os agendamentos
export async function listAgendamentos(_req: FastifyRequest, reply: FastifyReply) {
  try {
    const list = await prisma.transferenciaAgendada.findMany({
      orderBy: { executarEm: 'asc' },
      include: {
        item: { select: { nome: true } },
        origem: { select: { nome: true } },
        destino: { select: { nome: true } },
        usuario: { select: { nome: true } },
      },
    });

    const formatted = list.map((ag) => ({
      id: ag.id,
      itemId: ag.itemId,
      estoqueOrigemId: ag.estoqueOrigemId,
      estoqueDestinoId: ag.estoqueDestinoId,
      quantidade: ag.quantidade,
      executarEm: ag.executarEm,
      status: ag.status,
      erroUltimaTentativa: ag.erroUltimaTentativa,
      item: ag.item ? { nome: ag.item.nome } : undefined,
      estoqueOrigem: ag.origem ? { nome: ag.origem.nome } : undefined,
      estoqueDestino: ag.destino ? { nome: ag.destino.nome } : undefined,

      usuarioNome: ag.usuario?.nome ?? `user#${ag.usuarioId}`,
    }));

    return reply.send(formatted);
  } catch (e) {
    return reply.status(500).send({ error: 'Erro ao listar agendamentos' });
  }
}

// Obter um agendamento pelo id
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

// Executar manualmente um agendamento específico
export async function postExecutarAgendamento(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return reply.code(400).send({ error: "id inválido" });
  const r = await executarAgendamento(id);
  return reply.send(r);
}

// Executar em lote agendamentos pendentes
export async function postExecutarPendentes(
  req: FastifyRequest<{ Querystring: { limit?: string } }>,
  reply: FastifyReply
) {
  const limit = req.query?.limit ? Number(req.query.limit) : 50;
  const r = await executarPendentes(Number.isFinite(limit) ? limit : 50);
  return reply.send(r);
}

// Listar agendamentos automaticos pendentes (por item/estoque)
export async function getAutoPendentes(
  req: FastifyRequest<{ Querystring: { itemId?: number; estoqueId?: number } }>,
  reply: FastifyReply
) {
  const { itemId, estoqueId } = req.query ?? {};
  const where: any = {
    status: "PENDING",
    origemTipo: "AUTO",
    ...(itemId ? { itemId: Number(itemId) } : {}),
    ...(estoqueId ? { estoqueDestinoId: Number(estoqueId) } : {}),
  };
  const rows = await prisma.transferenciaAgendada.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return reply.send(rows);
}

// Rodar rotina de auto-reposição para um item em um estoque
export async function runAutoRepos(
  req: FastifyRequest<{ 
    Params: { estoqueId: string; itemId: string }; 
    Body: { estoqueId?: number; itemId?: number } 
  }>,
  reply: FastifyReply
) {
  try {
    const destId = Number(req.params.estoqueId ?? req.body?.estoqueId);
    const itemId = Number(req.params.itemId ?? req.body?.itemId);

    if (!Number.isFinite(destId) || !Number.isFinite(itemId)) {
      return reply.code(400).send({ error: 'estoqueId e itemId são obrigatórios' });
    }

    const result = await autoReposicaoAutomatica(destId, itemId);

    return reply.send(result);
  } catch (e: any) {
    return reply
      .code(500)
      .send({ error: e?.message ?? 'Falha ao rodar auto-reposição' });
  }
}