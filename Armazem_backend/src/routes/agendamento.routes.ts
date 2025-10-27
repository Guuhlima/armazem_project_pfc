// routes/agendamento.routes.ts
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
  runAutoRepos
} from "../controllers/agendamento.controller";
import { verifyToken } from "../middlewares/verifyToken";

// ⬇️ NOVO: controllers de execução
import {
  postExecutarAgendamento,
  postExecutarPendentes,
  getAutoPendentes
} from "../controllers/agendamento.controller"; // ajuste o path se usou outro nome

// ⬇️ NOVO: schemas (typebox) p/ rotas novas
import { Type } from "@sinclair/typebox";

const Body = Type.Object({
  estoqueId: Type.Integer({ minimum: 1 }),
  itemId: Type.Integer({ minimum: 1 }),
});

const ExecutarPendentesQuery = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
});

const AutoPendentesQuery = Type.Object({
  itemId: Type.Optional(Type.Integer({ minimum: 1 })),
  estoqueId: Type.Optional(Type.Integer({ minimum: 1 })),
});

export async function agendamentoRoutes(app: FastifyInstance) {
  app.addHook("preHandler", verifyToken);

  // === existentes ===
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


  app.post("/agendamentos/:id/executar", {
    schema: { params: AgendamentoParams },
    preHandler: [app.rbac.requirePerm("transfer:manage")],
    handler: postExecutarAgendamento,
  });

  app.post("/agendamentos/executar-pendentes", {
    schema: { querystring: ExecutarPendentesQuery },
    preHandler: [app.rbac.requirePerm("transfer:manage")],
    handler: postExecutarPendentes,
  });

  app.get("/agendamentos/auto-pendentes", {
    schema: { querystring: AutoPendentesQuery },
    preHandler: [app.rbac.requirePerm("transfer:manage")],
    handler: getAutoPendentes,
  });

  app.post('/auto-repos/run', {
    schema: { body: Body },
    preHandler: [app.rbac.requirePerm('transfer:manage')],
    handler: runAutoRepos,
  });
}