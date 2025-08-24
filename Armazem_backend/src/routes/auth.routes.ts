import type { FastifyInstance } from 'fastify';
import {
  login,
  refreshToken,
  logout,
  logoutAll,
  me,
} from '../controllers/auth.controller';

export async function authRoutes(app: FastifyInstance) {
  app.post('/user/login', { handler: login });
  app.post('/user/refresh', { handler: refreshToken });
  app.post('/user/logout', { handler: logout });

  app.post('/user/logout-all', { 
    preHandler: [app.authenticate],
    handler: logoutAll,
  });

  app.get('/user/me', {
    preHandler: [app.authenticate],
    handler: me,
  });
}
