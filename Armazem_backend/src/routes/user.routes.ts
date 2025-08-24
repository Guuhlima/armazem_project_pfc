import type { FastifyInstance } from 'fastify';
import {
  cadastrarUsuarios,
  visualizarUsuarios,
  visualizarUsuariosPorId,
  editarUsuarios,
  deletarUsuarios,
} from '../controllers/user.controller';
import {
  UsuarioBodySchema,
  UsuarioParamsSchema,
} from '../schemas/user.schema';

export async function usuariosRoutes(app: FastifyInstance) {
  // público: POST /user/cadastro
  app.post('/cadastro', { schema: { body: UsuarioBodySchema } }, cadastrarUsuarios);

  // protegido: GET /user/visualizar, /user/visualizar/:id, PUT /user/editar/:id
  app.register(async (r) => {
    r.addHook('onRequest', r.authenticate);
    r.addHook('preHandler', r.rbac.requirePerm('user:manage'));
    r.get('/visualizar', { handler: visualizarUsuarios });
    r.get('/visualizar/:id', { schema: { params: UsuarioParamsSchema }, handler: visualizarUsuariosPorId });
    r.put('/editar/:id', { schema: { params: UsuarioParamsSchema, body: UsuarioBodySchema }, handler: editarUsuarios });
  });

  // protegido: DELETE /user/deletar/:id
  app.register(async (r) => {
    r.addHook('onRequest', r.authenticate);
    r.addHook('preHandler', r.rbac.requirePerm('user:delete'));
    r.delete('/deletar/:id', { schema: { params: UsuarioParamsSchema }, handler: deletarUsuarios });
  });
}

