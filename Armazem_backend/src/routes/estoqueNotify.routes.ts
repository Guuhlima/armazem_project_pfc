// src/routes/estoqueNotify.routes.ts
import { FastifyInstance } from 'fastify'
import { verifyToken } from '../middlewares/verifyToken'
import {
  getTelegramNotifyForMe,
  upsertTelegramNotifyForMe,
  testTelegramNotifyForMe,
} from '../controllers/notificacoes.controller' // ajuste o caminho/nome do arquivo se for "notifications.controller"

type UpsertBody = { chatId?: string }

export async function estoqueNotifyRoutes(app: FastifyInstance) {
  app.register(async (r) => {
    r.addHook('preHandler', verifyToken)

    r.get<{ Params: { estoqueId: string } }>(
      '/estoques/:estoqueId/notify/telegram',
      { preHandler: [r.rbac.requirePerm('stock:manage')] }, // ou troque por 'stock:notify'
      getTelegramNotifyForMe
    )

    r.post<{ Params: { estoqueId: string }; Body: UpsertBody }>(
      '/estoques/:estoqueId/notify/telegram',
      { preHandler: [r.rbac.requirePerm('stock:manage')] },
      upsertTelegramNotifyForMe
    )

    r.post<{ Params: { estoqueId: string } }>(
      '/estoques/:estoqueId/notify/telegram/test',
      { preHandler: [r.rbac.requirePerm('stock:manage')] },
      testTelegramNotifyForMe
    )
  })
}
