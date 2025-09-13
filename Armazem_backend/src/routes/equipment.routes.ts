import { FastifyInstance } from "fastify";
import {
  cadastrarEquipamento,
  editarEquipamento,
  visualizarEquipamentos,
  visualizarEquipamentosPorId,
  deletarEquipamento,
} from "../controllers/equipment.controller";
import {
  EquipamentoBodySchema,
  EquipamentoParamsSchema,
} from "../schemas/equipment.schema";

export async function equipamentosRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/equipment/visualizar", {
    preHandler: [app.rbac.requirePerm("equipment:read")],
    handler: visualizarEquipamentos,
  });

  app.get("/equipment/visualizar/:id", {
    schema: { params: EquipamentoParamsSchema },
    preHandler: [app.rbac.requirePerm("equipment:read")],
    handler: visualizarEquipamentosPorId,
  });

  app.post("/equipment/cadastro", {
    schema: { body: EquipamentoBodySchema },
    preHandler: [app.rbac.requirePerm("equipment:manage")],
    handler: cadastrarEquipamento,
  });

  app.put("/equipment/editar/:id", {
    schema: { params: EquipamentoParamsSchema, body: EquipamentoBodySchema },
    preHandler: [app.rbac.requirePerm("equipment:manage")],
    handler: editarEquipamento,
  });

  app.delete("/equipment/deletar/:id", {
    schema: { params: EquipamentoParamsSchema },
    preHandler: [app.rbac.requirePerm("equipment:manage")],
    handler: deletarEquipamento,
  });
}
