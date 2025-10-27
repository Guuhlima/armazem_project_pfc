import { FastifyInstance } from 'fastify';
import { RecebimentoBodySchema } from '../schemas/recebimento.schema';
import { receberEquipamento } from '../controllers/recebimento.controller';

export async function recebimentoRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);

  app.post('/stock/receber', {
    schema: { body: RecebimentoBodySchema },
    preHandler: [app.rbac.requirePerm('stock:manage')],
    handler: receberEquipamento,
  });
}