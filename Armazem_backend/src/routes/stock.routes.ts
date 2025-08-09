import { FastifyInstance } from 'fastify';
import {
  cadastrarEstoque,
  visualizarEstoque,
  visualizarEstoquePorId,
  editarEstoque,
  deletarEstoque,
  visualizarItensPorEstoque
} from '../controllers/stock.controller';

import { EstoqueBodySchema, EstoqueParamsSchema } from '../schemas/stock.schema';
import { verifyToken } from '../middlewares/verifyToken';
import { requirePermissionExcluding } from '../middlewares/requirePermissionExcluding';

export async function estoquesRoutes(app: FastifyInstance) {
  app.register(async (estoqueRoutes) => {
    estoqueRoutes.addHook('preHandler', verifyToken);
    estoqueRoutes.addHook('preHandler', requirePermissionExcluding(['USER-EQUIPAMENTOS']));

    estoqueRoutes.post('/stock/cadastro', {
      schema: { body: EstoqueBodySchema },
      handler: cadastrarEstoque,
    });

    estoqueRoutes.get('/stock/visualizar', visualizarEstoque);

    estoqueRoutes.get('/stock/visualizar/:id', {
      schema: { params: EstoqueParamsSchema },
      handler: visualizarEstoquePorId,
    });

    estoqueRoutes.get('/stock/visualizar/:id/itens', {
      schema: { params: EstoqueParamsSchema },
      handler: visualizarItensPorEstoque,
    });

    estoqueRoutes.put('/stock/editar/:id', {
      schema: { params: EstoqueParamsSchema, body: EstoqueBodySchema },
      handler: editarEstoque,
    });

    estoqueRoutes.delete('/stock/deletar/:id', {
      schema: { params: EstoqueParamsSchema },
      handler: deletarEstoque,
    });
  });
}
