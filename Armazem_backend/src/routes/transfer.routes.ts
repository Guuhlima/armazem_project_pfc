import { FastifyInstance } from 'fastify';
import {
  realizarTransferencia,
  visualizarTransferencias,
  visualizarTransferenciaPorId,
  deletarTransferencia,
} from '../controllers/transfer.controller';

import { TransferenciaBodySchema, TransferenciaParamsSchema } from '../schemas/transfer.schema';
import { verifyToken } from '../middlewares/verifyToken';
import { requirePermissionExcluding } from '../middlewares/requirePermissionExcluding';

export async function transferenciasRoutes(app: FastifyInstance) {
  app.register(async (transferRoutes) => {
    transferRoutes.addHook('preHandler', verifyToken);
    transferRoutes.addHook(
      'preHandler',
      requirePermissionExcluding(['USER-EQUIP-TRANSFER', 'ADMIN'])
    );

    transferRoutes.post('/transfer/cadastro', {
      schema: { body: TransferenciaBodySchema },
      handler: realizarTransferencia,
    });

    transferRoutes.get('/transfer/visualizar', visualizarTransferencias);

    transferRoutes.get('/transfer/visualizar/:id', {
      schema: { params: TransferenciaParamsSchema },
      handler: visualizarTransferenciaPorId,
    });

    transferRoutes.delete('/transfer/deletar/:id', {
      schema: { params: TransferenciaParamsSchema },
      handler: deletarTransferencia,
    });
  });
}
