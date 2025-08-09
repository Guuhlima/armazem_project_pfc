import { FastifyInstance } from 'fastify';
import {
  cadastrarUsuarios,
  visualizarUsuarios,
  visualizarUsuariosPorId,
  deletarUsuarios,
  editarUsuarios,
  login,
} from '../controllers/user.controller';

import {
  UsuarioBodySchema,
  UsuarioParamsSchema,
  UsuarioLoginSchema,
} from '../schemas/user.schema';

import { verifyToken } from '../middlewares/verifyToken';
import { requirePermissionExcluding } from '../middlewares/requirePermissionExcluding';

export async function usuariosRoutes(app: FastifyInstance) {
  app.post('/user/login', {
    schema: { body: UsuarioLoginSchema },
    handler: login,
  });

  app.post('/user/cadastro', {
    schema: { body: UsuarioBodySchema },
    handler: cadastrarUsuarios,
  });

  app.register(async (userRoutes) => {
    userRoutes.addHook('preHandler', verifyToken);
    userRoutes.addHook('preHandler', requirePermissionExcluding(['ADMIN']));

    userRoutes.get('/user/visualizar', visualizarUsuarios);

    userRoutes.get('/user/visualizar/:id', {
      schema: { params: UsuarioParamsSchema },
      handler: visualizarUsuariosPorId,
    });

    userRoutes.put('/user/editar/:id', {
      schema: { body: UsuarioBodySchema, params: UsuarioParamsSchema },
      handler: editarUsuarios,
    });
  });

  app.register(async (deleteUserRoutes) => {
    deleteUserRoutes.addHook('preHandler', verifyToken);
    deleteUserRoutes.addHook('preHandler', requirePermissionExcluding(['SUPER-ADMIN']));

    deleteUserRoutes.delete('/user/deletar/:id', {
      schema: { params: UsuarioParamsSchema },
      handler: deletarUsuarios,
    });
  });
}
