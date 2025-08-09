import { FastifyInstance } from "fastify";
import {
    cadastrarEquipamento,
    editarEquipamento,
    visualizarEquipamentos,
    visualizarEquipamentosPorId,
    deletarEquipamento
} from "../controllers/equipment.controller";
import { EquipamentoBodySchema, EquipamentoParamsSchema } from "../schemas/equipment.schema";
import { verifyToken } from '../middlewares/verifyToken';

export async function equipamentosRoutes(app: FastifyInstance) {
  app.register(async (equipamentoRoutes) => {
    equipamentoRoutes.addHook('preHandler', verifyToken);

    equipamentoRoutes.post('/equipment/cadastro', {
      schema: { body: EquipamentoBodySchema },
      handler: cadastrarEquipamento,
    });

    equipamentoRoutes.get('/equipment/visualizar', visualizarEquipamentos);

    equipamentoRoutes.get('/equipment/visualizar/:id', {
      schema: { params: EquipamentoParamsSchema },
      handler: visualizarEquipamentosPorId,
    });

    equipamentoRoutes.put('/equipment/editar/:id', {
      schema: { params: EquipamentoParamsSchema, body: EquipamentoBodySchema },
      handler: editarEquipamento,
    });

    equipamentoRoutes.delete('/equipment/deletar/:id', {
      schema: { params: EquipamentoParamsSchema },
      handler: deletarEquipamento,
    });
  });
}
