import { FastifyInstance } from "fastify";
import { verifyToken } from "../middlewares/verifyToken";
import { TimeSeriesQuery, TopNQuery, ListQuery } from "../schemas/logs.schema";
import {
  visualizarSeriesLogs,
  visualizarTopLogs,
  visualizarEventosLogs,
} from "../controllers/logs.controller";

export async function logsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", verifyToken);

  // NOVO PADRÃO (vai sair como /logs/visualizar/series por causa do prefixo)
  app.get("/visualizar/series", {
    schema: { querystring: TimeSeriesQuery, tags: ["Logs"], summary: "Séries temporais" },
    preHandler: [app.rbac.requirePerm("logs:read")],
    handler: visualizarSeriesLogs,
  });

  app.get("/visualizar/top", {
    schema: { querystring: TopNQuery, tags: ["Logs"], summary: "Top N por dimensão" },
    preHandler: [app.rbac.requirePerm("logs:read")],
    handler: visualizarTopLogs,
  });

  app.get("/visualizar/eventos", {
    schema: { querystring: ListQuery, tags: ["Logs"], summary: "Eventos paginados" },
    preHandler: [app.rbac.requirePerm("logs:read")],
    handler: visualizarEventosLogs,
  });
}
