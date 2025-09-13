// src/controllers/notifications.controller.ts
import { FastifyReply, FastifyRequest, RouteHandler } from 'fastify'
import { prisma } from '../lib/prisma'
import { TelegramService } from '../service/telegram.service'

type EstoqueOnly = { estoqueId: string }
type UpsertBody = { chatId?: string }

export async function listNotifications(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = Number((req.user as any)?.id)
    if (!userId) return reply.code(401).send({ error: 'não autenticado' })

    const cursor =
      req.query && (req.query as any).cursor
        ? Number((req.query as any).cursor)
        : null
    const take = Math.min(Number((req.query as any)?.take ?? 20), 50)

    const res = await prisma.notificacao.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = res.length > take
    const items = hasMore ? res.slice(0, -1) : res

    return reply.send({
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    })
  } catch (err) {
    req.log.error({ err }, 'listNotifications error')
    return reply.code(500).send({ error: 'Erro ao listar notificações' })
  }
}

export async function unreadCount(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = Number((req.user as any)?.id)
    if (!userId) return reply.code(401).send({ error: 'não autenticado' })

    const count = await prisma.notificacao.count({
      where: { userId, readAt: null },
    })
    return reply.send({ count })
  } catch (err) {
    req.log.error({ err }, 'unreadCount error')
    return reply.code(500).send({ error: 'Erro ao buscar contagem de notificações' })
  }
}

export async function markRead(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const userId = Number((req.user as any)?.id)
    if (!userId) return reply.code(401).send({ error: 'não autenticado' })

    const id = Number(req.params.id)
    await prisma.notificacao.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    })
    return reply.send({ ok: true })
  } catch (err) {
    req.log.error({ err }, 'markRead error')
    return reply.code(500).send({ error: 'Erro ao marcar notificação como lida' })
  }
}

export async function markAllRead(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = Number((req.user as any)?.id)
    if (!userId) return reply.code(401).send({ error: 'não autenticado' })

    await prisma.notificacao.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })
    return reply.send({ ok: true })
  } catch (err) {
    req.log.error({ err }, 'markAllRead error')
    return reply.code(500).send({ error: 'Erro ao marcar todas notificações como lidas' })
  }
}

export const getTelegramNotifyForMe: RouteHandler<{ Params: EstoqueOnly }> = async (req, reply) => {
  const usuarioId = Number((req.user as any)?.id)
  const estoqueId = Number(req.params.estoqueId)

  if (!Number.isInteger(usuarioId) || !Number.isInteger(estoqueId)) {
    return reply.code(400).send({ error: 'userId/estoqueId inválidos' })
  }

  const row = await prisma.estoqueTelegramNotify.findFirst({
    where: { usuarioId, estoqueId },
    select: { chatId: true },
  })

  if (!row) return reply.code(404).send({ error: 'Nenhum chat vinculado' })
  return reply.send({ chatId: row.chatId })
}

export const upsertTelegramNotifyForMe: RouteHandler<{ Params: EstoqueOnly; Body: UpsertBody }> =
  async (req, reply) => {
    const usuarioId = Number((req.user as any)?.id)
    const estoqueId = Number(req.params.estoqueId)
    const { chatId } = req.body ?? {}

    if (!Number.isInteger(usuarioId) || !Number.isInteger(estoqueId)) {
      return reply.code(400).send({ error: 'userId/estoqueId inválidos' })
    }
    if (!chatId || !chatId.trim()) {
      return reply.code(400).send({ error: 'chatId obrigatório' })
    }

    const existing = await prisma.estoqueTelegramNotify.findFirst({
      where: { usuarioId, estoqueId },
      select: { id: true },
    })

    if (existing) {
      await prisma.estoqueTelegramNotify.update({
        where: { id: existing.id },
        data: { chatId },
      })
    } else {
      await prisma.estoqueTelegramNotify.create({
        data: { usuarioId, estoqueId, chatId },
      })
    }

    return reply.send({ ok: true })
  }

export const testTelegramNotifyForMe: RouteHandler<{ Params: EstoqueOnly }> = async (req, reply) => {
  const usuarioId = Number((req.user as any)?.id)
  const estoqueId = Number(req.params.estoqueId)

  if (!Number.isInteger(usuarioId) || !Number.isInteger(estoqueId)) {
    return reply.code(400).send({ error: 'userId/estoqueId inválidos' })
  }

  const row = await prisma.estoqueTelegramNotify.findFirst({
    where: { usuarioId, estoqueId },
    select: { chatId: true },
  })

  if (!row?.chatId) {
    return reply.code(404).send({ error: 'Nenhum chat vinculado para este usuário/estoque' })
  }

  const text = `✅ Teste de notificação do estoque #${estoqueId} para o usuário #${usuarioId} em ${new Date().toLocaleString('pt-BR')}`
  await TelegramService.safeSendRaw(row.chatId, text)
  return reply.send({ ok: true })
}