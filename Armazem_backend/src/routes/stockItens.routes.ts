import { FastifyInstance } from "fastify";
import {
  adicionarItemAoEstoque,
  visualizarItensDoEstoque,
  visualizarQuantidadePorItemNoEstoque,
} from "../controllers/stockItens.controller";
import {
  EstoqueItemBodySchema,
  EstoqueItemParamsSchema,
  EstoqueItemQuantidadeParamsSchema,
} from "../schemas/stockItens.schema";
import { verifyToken } from "../middlewares/verifyToken";

export async function estoqueItensRoutes(app: FastifyInstance) {
  app.addHook("preHandler", verifyToken);

  app.post("/stockmovi/cadastro/:id/adicionar-equipamento", {
    schema: { params: EstoqueItemParamsSchema, body: EstoqueItemBodySchema },
    preHandler: [app.rbac.requirePerm("stock:manage")],
    handler: adicionarItemAoEstoque,
  });

  app.get("/stockmovi/visualizar/:id/itens", {
    schema: { params: EstoqueItemParamsSchema },
    preHandler: [app.rbac.requirePerm("stock:read")],
    handler: visualizarItensDoEstoque,
  });

  app.get("/stockmovi/visualizar/:estoqueId/itens-quantidade/:itemId", {
    schema: { params: EstoqueItemQuantidadeParamsSchema },
    preHandler: [app.rbac.requirePerm("stock:read")],
    handler: visualizarQuantidadePorItemNoEstoque,
  });
}
