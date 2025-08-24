import type { FastifyInstance } from 'fastify';
import { listNotifications, unreadCount, markRead, markAllRead } from '../controllers/notificacoes.controller';

export async function notificationsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);

  app.get('/notifications', listNotifications);
  app.get('/notifications/unread-count', unreadCount);
  app.post('/notifications/:id/read', markRead);
  app.post('/notifications/read-all', markAllRead);
}
