// src/controllers/notifications.controller.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma';

export async function listNotifications(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = Number((req.user as any)?.id);
    if (!userId) return reply.code(401).send({ error: 'não autenticado' });

    const cursor = req.query && (req.query as any).cursor ? Number((req.query as any).cursor) : null;
    const take = Math.min(Number((req.query as any)?.take ?? 20), 50);

    const res = await prisma.notificacao.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = res.length > take;
    const items = hasMore ? res.slice(0, -1) : res;

    return reply.send({ items, nextCursor: hasMore ? items[items.length - 1]?.id : null });
  } catch (err) {
    req.log.error({ err }, 'listNotifications error');
    return reply.code(500).send({ error: 'Erro ao listar notificações' });
  }
}

export async function unreadCount(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = Number((req.user as any)?.id);
    if (!userId) return reply.code(401).send({ error: 'não autenticado' });

    const count = await prisma.notificacao.count({ where: { userId, readAt: null } });
    return reply.send({ count });
  } catch (err) {
    req.log.error({ err }, 'unreadCount error');
    return reply.code(500).send({ error: 'Erro ao buscar contagem de notificações' });
  }
}

export async function markRead(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const userId = Number((req.user as any)?.id);
    if (!userId) return reply.code(401).send({ error: 'não autenticado' });

    const id = Number(req.params.id);
    await prisma.notificacao.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return reply.send({ ok: true });
  } catch (err) {
    req.log.error({ err }, 'markRead error');
    return reply.code(500).send({ error: 'Erro ao marcar notificação como lida' });
  }
}

export async function markAllRead(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = Number((req.user as any)?.id);
    if (!userId) return reply.code(401).send({ error: 'não autenticado' });

    await prisma.notificacao.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return reply.send({ ok: true });
  } catch (err) {
    req.log.error({ err }, 'markAllRead error');
    return reply.code(500).send({ error: 'Erro ao marcar todas notificações como lidas' });
  }
}
