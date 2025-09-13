import type { FastifyInstance } from 'fastify';
import { listNotifications, unreadCount, markRead, markAllRead, getTelegramNotifyForMe, upsertTelegramNotifyForMe, testTelegramNotifyForMe } from '../controllers/notificacoes.controller';

type UpsertBody = { chatId?: string };

export async function notificationsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);

  app.get('/notifications', listNotifications);
  app.get('/notifications/unread-count', unreadCount);
  app.post('/notifications/:id/read', markRead);
  app.post('/notifications/read-all', markAllRead);

    app.get<{ Params: { estoqueId: string } }>(
      "/estoques/:estoqueId/notify/telegram",
      {
        preHandler: [app.rbac.requirePerm("stock:manage")],
        handler: getTelegramNotifyForMe,
      }
    );
  
    app.post<{ Params: { estoqueId: string }; Body: UpsertBody }>(
      "/estoques/:estoqueId/notify/telegram",
      {
        preHandler: [app.rbac.requirePerm("stock:manage")],
        handler: upsertTelegramNotifyForMe,
      }
    );
  
    app.post<{ Params: { estoqueId: string } }>(
      "/estoques/:estoqueId/notify/telegram/test",
      {
        preHandler: [app.rbac.requirePerm("stock:manage")],
        handler: testTelegramNotifyForMe,
      }
    );
}
