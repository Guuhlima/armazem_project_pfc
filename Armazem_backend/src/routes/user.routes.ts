import type { FastifyInstance } from "fastify";
import {
  cadastrarUsuarios,
  visualizarUsuarios,
  visualizarUsuariosPorId,
  editarUsuarios,
  deletarUsuarios,
} from "../controllers/user.controller";
import {
  UsuarioBodySchema,
  UsuarioParamsSchema,
} from "../schemas/user.schema";

export async function usuariosRoutes(app: FastifyInstance) {
  app.post("/cadastro", {
    schema: { body: UsuarioBodySchema },
    handler: cadastrarUsuarios,
  });

  app.addHook("onRequest", app.authenticate);

  app.get("/visualizar", {
    preHandler: [app.rbac.requirePerm("user:manage")],
    handler: visualizarUsuarios,
  });

  app.get("/visualizar/:id", {
    schema: { params: UsuarioParamsSchema },
    preHandler: [app.rbac.requirePerm("user:manage")],
    handler: visualizarUsuariosPorId,
  });

  app.put("/editar/:id", {
    schema: { params: UsuarioParamsSchema, body: UsuarioBodySchema },
    preHandler: [app.rbac.requirePerm("user:manage")],
    handler: editarUsuarios,
  });

  app.delete("/deletar/:id", {
    schema: { params: UsuarioParamsSchema },
    preHandler: [app.rbac.requirePerm("user:delete")],
    handler: deletarUsuarios,
  });
}
