import type { FastifyInstance } from "fastify";
import {
  cadastrarUsuarios,
  visualizarUsuarios,
  visualizarUsuariosPorId,
  editarUsuarios,
  deletarUsuarios,
} from "../controllers/user.controller";
import {
  UsuarioCreateBodySchema,
  UsuarioUpdateBodySchema,
  UsuarioParamsSchema,
} from "../schemas/user.schema";

export async function usuariosRoutes(app: FastifyInstance) {
  app.post("/cadastro", {
    schema: { body: UsuarioCreateBodySchema },
    handler: cadastrarUsuarios,
  });

  await app.register(async (r) => {
    r.addHook("onRequest", r.authenticate);

    r.get("/visualizar", {
      preHandler: [r.rbac.requireAuth()],
      handler: visualizarUsuarios,
    });

    r.get("/visualizar/:id", {
      schema: { params: UsuarioParamsSchema },
      preHandler: [r.rbac.requirePerm("user:manage")],
      handler: visualizarUsuariosPorId,
    });

    r.put("/editar/:id", {
      schema: { params: UsuarioParamsSchema, body: UsuarioUpdateBodySchema },
      preHandler: [r.rbac.requirePerm("user:manage")],
      handler: editarUsuarios,
    });

    r.delete("/deletar/:id", {
      schema: { params: UsuarioParamsSchema },
      preHandler: [r.rbac.requireAuth()],
      handler: deletarUsuarios,
    });
  });
}