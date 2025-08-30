// src/routes/estoqueNotify.routes.ts
import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../middlewares/verifyToken';
import { TelegramService } from '../service/telegram.service';

export async function estoqueNotifyRoutes(app: FastifyInstance) {
  app.register(async (r) => {
    r.addHook('preHandler', verifyToken);

    // LER chatId do usuário para um estoque
    r.get('/admin/usuarios/:userId/estoques/:estoqueId/notify/telegram', {
      preHandler: [r.rbac.requirePerm('stock:manage')],
      handler: async (req, reply) => {
        const usuarioId = Number((req.params as any).userId);
        const estoqueId = Number((req.params as any).estoqueId);
        if (!Number.isInteger(usuarioId) || !Number.isInteger(estoqueId)) {
          return reply.code(400).send({ error: 'userId/estoqueId inválidos' });
        }

        // fallback: findFirst em vez de findUnique(usuarioId_estoqueId)
        const row = await prisma.estoqueTelegramNotify.findFirst({
          where: { usuarioId, estoqueId },
          select: { chatId: true },
        });

        return reply.send({ chatId: row?.chatId ?? null });
      },
    });

    // SALVAR/ATUALIZAR chatId (opt-in por usuário + estoque)
    r.post('/admin/usuarios/:userId/estoques/:estoqueId/notify/telegram', {
      preHandler: [r.rbac.requirePerm('stock:manage')],
      handler: async (req, reply) => {
        const usuarioId = Number((req.params as any).userId);
        const estoqueId = Number((req.params as any).estoqueId);
        const { chatId } = (req.body as any) as { chatId?: string };

        if (!Number.isInteger(usuarioId) || !Number.isInteger(estoqueId)) {
          return reply.code(400).send({ error: 'userId/estoqueId inválidos' });
        }
        if (!chatId || !chatId.trim()) {
          return reply.code(400).send({ error: 'chatId obrigatório' });
        }

        try {
          // fallback: "upsert manual"
          const existing = await prisma.estoqueTelegramNotify.findFirst({
            where: { usuarioId, estoqueId },
            select: { id: true },
          });

          if (existing) {
            await prisma.estoqueTelegramNotify.update({
              where: { id: existing.id },
              data: { chatId },
            });
          } else {
            await prisma.estoqueTelegramNotify.create({
              data: { usuarioId, estoqueId, chatId },
            });
          }

          return reply.send({ ok: true });
        } catch (e: any) {
          if (e?.code === 'P2003') {
            return reply.code(400).send({ error: 'Usuário/Estoque inexistente (violação de FK)' });
          }
          if (e?.code === 'P2002') {
            // corrida rara: outro processo inseriu antes. Faz um update usando a linha real.
            const row = await prisma.estoqueTelegramNotify.findFirst({
              where: { usuarioId, estoqueId },
              select: { id: true },
            });
            if (row) {
              await prisma.estoqueTelegramNotify.update({
                where: { id: row.id },
                data: { chatId },
              });
              return reply.send({ ok: true });
            }
          }
          req.log.error(e, 'Erro ao salvar notify');
          return reply.code(500).send({ error: 'Falha ao salvar notify' });
        }
      },
    });

    // TESTE (envia só para aquele usuário/estoque)
    r.post('/admin/usuarios/:userId/estoques/:estoqueId/notify/telegram/test', {
      preHandler: [r.rbac.requirePerm('stock:manage')],
      handler: async (req, reply) => {
        const usuarioId = Number((req.params as any).userId);
        const estoqueId = Number((req.params as any).estoqueId);
        if (!Number.isInteger(usuarioId) || !Number.isInteger(estoqueId)) {
          return reply.code(400).send({ error: 'userId/estoqueId inválidos' });
        }

        // fallback: findFirst
        const row = await prisma.estoqueTelegramNotify.findFirst({
          where: { usuarioId, estoqueId },
          select: { chatId: true },
        });

        if (!row?.chatId) {
          return reply.code(404).send({ error: 'Nenhum chat vinculado para este usuário/estoque' });
        }

        try {
          const text = `✅ Teste de notificação do estoque #${estoqueId} para o usuário #${usuarioId} em ${new Date().toLocaleString('pt-BR')}`;
          await TelegramService.safeSendRaw(row.chatId, text);
          return reply.send({ ok: true });
        } catch (e) {
          req.log.error(e, 'Falha ao enviar teste de Telegram');
          return reply.code(502).send({ error: 'Falha ao enviar mensagem no Telegram' });
        }
      },
    });
  });
}
