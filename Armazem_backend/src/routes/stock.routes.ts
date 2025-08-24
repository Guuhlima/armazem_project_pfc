import { FastifyInstance } from 'fastify';
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
} from '../controllers/stock.controller';

import { EstoqueBodySchema, EstoqueParamsSchema } from '../schemas/stock.schema';
export async function estoquesRoutes(app: FastifyInstance) {
  app.register(async (r) => {
    r.addHook('onRequest', r.authenticate);

    r.get('/estoques/me', { handler: meusEstoques });

    // SUPER-ADMIN pode vincular direto (se quiser, adicione um preHandler de permissão aqui)
    r.post('/estoques/:id/vincular-me', { handler: vincularMeAoEstoque });
    r.delete('/estoques/:id/vincular-me', { handler: desvincularMeDoEstoque });

    // 🔥 estas duas rotas evitam o 404 e alimentam o modal
    r.get('/estoques/disponiveis', { handler: listarEstoquesDisponiveis });
    r.post('/estoques/:id/solicitar-acesso', { handler: solicitarAcessoAoEstoque });

    // admin vincula qualquer usuário
    r.post('/usuarios/:userId/estoques/:estoqueId', {
      preHandler: [r.rbac.requirePerm('user:manage')],
      handler: vincularUsuarioAoEstoque,
    });
    r.delete('/usuarios/:userId/estoques/:estoqueId', {
      preHandler: [r.rbac.requirePerm('user:manage')],
      handler: desvincularUsuarioDoEstoque,
    });

    // seu CRUD legado em /stock/*
    r.post('/stock/cadastro', { schema: { body: EstoqueBodySchema }, handler: cadastrarEstoque });
    r.get('/stock/visualizar', visualizarEstoque);
    r.get('/stock/visualizar/:id', { schema: { params: EstoqueParamsSchema }, handler: visualizarEstoquePorId });
    r.get('/stock/visualizar/:id/itens', { schema: { params: EstoqueParamsSchema }, handler: visualizarItensPorEstoque });
    r.put('/stock/editar/:id', { schema: { params: EstoqueParamsSchema, body: EstoqueBodySchema }, handler: editarEstoque });
    r.delete('/stock/deletar/:id', { schema: { params: EstoqueParamsSchema }, handler: deletarEstoque });
  });
}
