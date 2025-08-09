import { FastifyInstance } from 'fastify';
import {
  adicionarItemAoEstoque,
  visualizarItensDoEstoque,
  visualizarQuantidadePorItemNoEstoque
} from '../controllers/stockItens.controller';

import {
  EstoqueItemBodySchema,
  EstoqueItemParamsSchema,
  EstoqueItemQuantidadeParamsSchema
} from '../schemas/stockItens.schema';

import { verifyToken } from '../middlewares/verifyToken';
import { requirePermissionExcluding } from '../middlewares/requirePermissionExcluding';

export async function estoqueItensRoutes(app: FastifyInstance) {
  app.register(async (movRoutes) => {
    movRoutes.addHook('preHandler', verifyToken);
    movRoutes.addHook('preHandler', requirePermissionExcluding(['USER-EQUIPAMENTOS']));

    movRoutes.post('/stockmovi/cadastro/:id/adicionar-equipamento', {
      schema: {
        params: EstoqueItemParamsSchema,
        body: EstoqueItemBodySchema,
      },
      handler: adicionarItemAoEstoque,
    });

    movRoutes.get('/stockmovi/visualizar/:id/itens', {
      schema: {
        params: EstoqueItemParamsSchema,
      },
      handler: visualizarItensDoEstoque,
    });

    movRoutes.get('/stockmovi/visualizar/:estoqueId/itens-quantidade/:itemId', {
      schema: { params: EstoqueItemQuantidadeParamsSchema },
      handler: visualizarQuantidadePorItemNoEstoque,
    });
  });
}
