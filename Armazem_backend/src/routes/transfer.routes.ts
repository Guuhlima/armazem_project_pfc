import { FastifyInstance } from 'fastify';
import {
  realizarTransferencia,
  visualizarTransferencias,
  visualizarTransferenciaPorId,
  deletarTransferencia,
} from '../controllers/transfer.controller';
import { TransferenciaBodySchema, TransferenciaParamsSchema } from '../schemas/transfer.schema';
import { verifyToken } from '../middlewares/verifyToken';

export async function transferenciasRoutes(app: FastifyInstance) {
  app.register(async (r) => {
    r.addHook('preHandler', verifyToken);

    r.post('/transfer/cadastro', {
      schema: { body: TransferenciaBodySchema },
      preHandler: [r.rbac.requirePerm('transfer:manage')],
      handler: realizarTransferencia,
    });

    r.get('/transfer/visualizar', {
      preHandler: [r.rbac.requirePerm('transfer:manage')],
      handler: visualizarTransferencias,
    });

    r.get('/transfer/visualizar/:id', {
      schema: { params: TransferenciaParamsSchema },
      preHandler: [r.rbac.requirePerm('transfer:manage')],
      handler: visualizarTransferenciaPorId,
    });

    r.delete('/transfer/deletar/:id', {
      schema: { params: TransferenciaParamsSchema },
      preHandler: [r.rbac.requirePerm('transfer:manage')],
      handler: deletarTransferencia,
    });
  });
}
