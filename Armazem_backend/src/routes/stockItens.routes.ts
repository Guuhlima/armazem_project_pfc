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

export async function estoqueItensRoutes(app: FastifyInstance) {
  app.register(async (r) => {
    r.addHook('preHandler', verifyToken);

    r.post('/stockmovi/cadastro/:id/adicionar-equipamento', {
      schema: { params: EstoqueItemParamsSchema, body: EstoqueItemBodySchema },
      preHandler: [r.rbac.requirePerm('stock:manage')],
      handler: adicionarItemAoEstoque,
    });

    r.get('/stockmovi/visualizar/:id/itens', {
      schema: { params: EstoqueItemParamsSchema },
      preHandler: [r.rbac.requirePerm('stock:read')],
      handler: visualizarItensDoEstoque,
    });

    r.get('/stockmovi/visualizar/:estoqueId/itens-quantidade/:itemId', {
      schema: { params: EstoqueItemQuantidadeParamsSchema },
      preHandler: [r.rbac.requirePerm('stock:read')],
      handler: visualizarQuantidadePorItemNoEstoque,
    });
  });
}
