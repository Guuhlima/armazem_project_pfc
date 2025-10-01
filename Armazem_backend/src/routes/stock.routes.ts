import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';

import {
  cadastrarEstoque,
  visualizarEstoque,
  visualizarEstoquePorId,
  editarEstoque,
  deletarEstoque,
  visualizarItensPorEstoque,
  meusEstoques,
  vincularMeAoEstoque,
  desvincularMeDoEstoque,
  vincularUsuarioAoEstoque,
  desvincularUsuarioDoEstoque,
  listarEstoquesDisponiveis,
  solicitarAcessoAoEstoque,
  definirMinimoItemNoEstoque,
} from '../controllers/stock.controller';

import {
  listarItensAbaixoDoMinimo,
  listarAlertasAbertos,
} from '../controllers/stockAlerts.controller';

import {
  EstoqueBodySchema,
  EstoqueParamsSchema,
} from '../schemas/stock.schema';

import { EstoqueMinimoBodySchema } from '../schemas/estoqueMinimo.schema';

const SetMinimoParamsSchema = Type.Object({
  estoqueId: Type.String(),
  itemId: Type.String(),
});

const EstoqueIdOnlyParamsSchema = Type.Object({
  estoqueId: Type.String(),
});

export async function estoquesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);

  // ===== Usuário x Estoques =====
  app.get('/estoques/me', { handler: meusEstoques });
  app.post('/estoques/:id/vincular-me', { handler: vincularMeAoEstoque });
  app.delete('/estoques/:id/vincular-me', { handler: desvincularMeDoEstoque });

  app.get('/estoques/disponiveis', { handler: listarEstoquesDisponiveis });
  app.post('/estoques/:id/solicitar-acesso', { handler: solicitarAcessoAoEstoque });

  app.post('/usuarios/:userId/estoques/:estoqueId', {
    preHandler: [app.rbac.requirePerm('user:manage')],
    handler: vincularUsuarioAoEstoque,
  });
  app.delete('/usuarios/:userId/estoques/:estoqueId', {
    preHandler: [app.rbac.requirePerm('user:manage')],
    handler: desvincularUsuarioDoEstoque,
  });

  // ===== CRUD de Estoque (seu prefixo atual /stock) =====
  app.post('/stock/cadastro', {
    schema: { body: EstoqueBodySchema },
    handler: cadastrarEstoque,
  });
  app.get('/stock/visualizar', { handler: visualizarEstoque });
  app.get('/stock/visualizar/:id', {
    schema: { params: EstoqueParamsSchema },
    handler: visualizarEstoquePorId,
  });
  app.get('/stock/visualizar/:id/itens', {
    schema: { params: EstoqueParamsSchema },
    handler: visualizarItensPorEstoque,
  });
  app.put('/stock/editar/:id', {
    schema: { params: EstoqueParamsSchema, body: EstoqueBodySchema },
    handler: editarEstoque,
  });
  app.delete('/stock/deletar/:id', {
    schema: { params: EstoqueParamsSchema },
    handler: deletarEstoque,
  });

  // ===== Minimo + Alertas =====
  app.put('/estoques/:estoqueId/itens/:itemId/minimo', {
    schema: {
      params: SetMinimoParamsSchema,
      body: EstoqueMinimoBodySchema,
    },
    handler: definirMinimoItemNoEstoque,
  });

  app.get('/estoques/:estoqueId/itens-abaixo-minimo', {
    schema: { params: EstoqueIdOnlyParamsSchema },
    handler: listarItensAbaixoDoMinimo,
  });

  app.get('/estoques/:estoqueId/alertas', {
    schema: { params: EstoqueIdOnlyParamsSchema },
    handler: listarAlertasAbertos,
  });
}
