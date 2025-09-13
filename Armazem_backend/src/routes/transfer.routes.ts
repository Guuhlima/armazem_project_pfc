import { FastifyInstance } from "fastify";
import {
  realizarTransferencia,
  visualizarTransferencias,
  visualizarTransferenciaPorId,
  deletarTransferencia,
} from "../controllers/transfer.controller";
import {
  TransferenciaBodySchema,
  TransferenciaParamsSchema,
} from "../schemas/transfer.schema";
import { verifyToken } from "../middlewares/verifyToken";

export async function transferenciasRoutes(app: FastifyInstance) {
  app.addHook("preHandler", verifyToken);

  app.post("/transfer/cadastro", {
    schema: { body: TransferenciaBodySchema },
    preHandler: [app.rbac.requirePerm("transfer:manage")],
    handler: realizarTransferencia,
  });

  app.get("/transfer/visualizar", {
    preHandler: [app.rbac.requirePerm("transfer:manage")],
    handler: visualizarTransferencias,
  });

  app.get("/transfer/visualizar/:id", {
    schema: { params: TransferenciaParamsSchema },
    preHandler: [app.rbac.requirePerm("transfer:manage")],
    handler: visualizarTransferenciaPorId,
  });

  app.delete("/transfer/deletar/:id", {
    schema: { params: TransferenciaParamsSchema },
    preHandler: [app.rbac.requirePerm("transfer:manage")],
    handler: deletarTransferencia,
  });
}
