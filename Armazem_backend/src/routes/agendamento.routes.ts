import { FastifyInstance } from "fastify";
import {
  AgendamentoCreateBody,
  AgendamentoParams,
} from "../schemas/agendamento.schema";
import {
  createAgendamento,
  cancelAgendamento,
  listAgendamentos,
  getAgendamentoById,
} from "../controllers/agendamento.controller";
import { verifyToken } from "../middlewares/verifyToken";

export async function agendamentoRoutes(app: FastifyInstance) {
  app.addHook("preHandler", verifyToken);

  app.post("/agendamentos", {
    schema: { body: AgendamentoCreateBody },
    preHandler: [app.rbac.requirePerm("transfer:manage")],
    handler: createAgendamento,
  });

  app.delete("/agendamentos/:id", {
    schema: { params: AgendamentoParams },
    preHandler: [app.rbac.requirePerm("transfer:manage")],
    handler: cancelAgendamento,
  });

  app.get("/agendamentos", {
    preHandler: [app.rbac.requirePerm("transfer:manage")],
    handler: listAgendamentos,
  });

  app.get("/agendamentos/:id", {
    schema: { params: AgendamentoParams },
    preHandler: [app.rbac.requirePerm("transfer:manage")],
    handler: getAgendamentoById,
  });
}
