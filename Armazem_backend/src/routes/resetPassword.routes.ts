import { FastifyInstance } from "fastify";
import {
  solicitarResetSenha,
  validarTokenReset,
  confirmarResetSenha,
} from '../controllers/resetPassword.controller';

export async function resetPasswordRoutes(app: FastifyInstance) {
  app.post('/auth/reset/request', solicitarResetSenha);
  app.post('/auth/reset/validate', validarTokenReset);
  app.post('/auth/reset/confirm', confirmarResetSenha);
}
