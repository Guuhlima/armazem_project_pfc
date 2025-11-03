// routes/contagem.routes.ts
import { FastifyInstance } from "fastify";
import {
  listarTarefasHandler,
  gerarHandler,
  iniciarHandler,
  lancarHandler,
  cancelarHandler,
} from "../controllers/contagem.controller";
import {
  ListTasksQuerySchema,
  CountParamsIdSchema,
  StartCountBodySchema,
  InputCountBodySchema,
  CancelCountBodySchema,
} from "../schemas/contagem.schema";

export async function contagemRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/counting/tasks", {
    schema: { querystring: ListTasksQuerySchema },
    preHandler: [app.rbac.requirePerm("count:read")],
    handler: listarTarefasHandler,
  });

  app.post("/counting/generate", {
    preHandler: [app.rbac.requirePerm("count:generate")],
    handler: gerarHandler,
  });

  app.post("/counting/:id/start", {
    schema: { params: CountParamsIdSchema, body: StartCountBodySchema },
    preHandler: [app.rbac.requirePerm("count:start")],
    handler: iniciarHandler,
  });

  app.post("/counting/:id/input", {
    schema: { params: CountParamsIdSchema, body: InputCountBodySchema },
    preHandler: [app.rbac.requirePerm("count:input")],
    handler: lancarHandler,
  });

  app.post("/counting/:id/cancel", {
    schema: { params: CountParamsIdSchema, body: CancelCountBodySchema },
    preHandler: [app.rbac.requirePerm("count:cancel")],
    handler: cancelarHandler,
  });
}
