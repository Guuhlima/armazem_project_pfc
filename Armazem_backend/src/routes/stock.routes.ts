import { FastifyInstance } from "fastify";
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
} from "../controllers/stock.controller";

import {
  EstoqueBodySchema,
  EstoqueParamsSchema,
} from "../schemas/stock.schema";

export async function estoquesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/estoques/me", { handler: meusEstoques });
  app.post("/estoques/:id/vincular-me", { handler: vincularMeAoEstoque });
  app.delete("/estoques/:id/vincular-me", { handler: desvincularMeDoEstoque });

  app.get("/estoques/disponiveis", { handler: listarEstoquesDisponiveis });
  app.post("/estoques/:id/solicitar-acesso", {
    handler: solicitarAcessoAoEstoque,
  });


  app.post("/usuarios/:userId/estoques/:estoqueId", {
    preHandler: [app.rbac.requirePerm("user:manage")],
    handler: vincularUsuarioAoEstoque,
  });
  app.delete("/usuarios/:userId/estoques/:estoqueId", {
    preHandler: [app.rbac.requirePerm("user:manage")],
    handler: desvincularUsuarioDoEstoque,
  });

  app.post("/stock/cadastro", {
    schema: { body: EstoqueBodySchema },
    handler: cadastrarEstoque,
  });
  app.get("/stock/visualizar", { handler: visualizarEstoque });
  app.get("/stock/visualizar/:id", {
    schema: { params: EstoqueParamsSchema },
    handler: visualizarEstoquePorId,
  });
  app.get("/stock/visualizar/:id/itens", {
    schema: { params: EstoqueParamsSchema },
    handler: visualizarItensPorEstoque,
  });
  app.put("/stock/editar/:id", {
    schema: { params: EstoqueParamsSchema, body: EstoqueBodySchema },
    handler: editarEstoque,
  });
  app.delete("/stock/deletar/:id", {
    schema: { params: EstoqueParamsSchema },
    handler: deletarEstoque,
  });
}
