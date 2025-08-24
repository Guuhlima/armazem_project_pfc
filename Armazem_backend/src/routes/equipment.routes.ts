import { FastifyInstance } from "fastify";
import {
  cadastrarEquipamento,
  editarEquipamento,
  visualizarEquipamentos,
  visualizarEquipamentosPorId,
  deletarEquipamento
} from "../controllers/equipment.controller";
import { EquipamentoBodySchema, EquipamentoParamsSchema } from "../schemas/equipment.schema";

export async function equipamentosRoutes(app: FastifyInstance) {
  app.register(async (r) => {
    // exige JWT em todas as rotas deste grupo
    r.addHook('onRequest', r.authenticate);

    // LISTAR (read)
    r.get('/equipment/visualizar', {
      preHandler: [r.rbac.requirePerm('equipment:read')],
      handler: visualizarEquipamentos,
    });

    // DETALHE (read)
    r.get('/equipment/visualizar/:id', {
      schema: { params: EquipamentoParamsSchema },
      preHandler: [r.rbac.requirePerm('equipment:read')],
      handler: visualizarEquipamentosPorId,
    });

    // CRIAR (manage)
    r.post('/equipment/cadastro', {
      schema: { body: EquipamentoBodySchema },
      preHandler: [r.rbac.requirePerm('equipment:manage')],
      handler: cadastrarEquipamento,
    });

    // EDITAR (manage)
    r.put('/equipment/editar/:id', {
      schema: { params: EquipamentoParamsSchema, body: EquipamentoBodySchema },
      preHandler: [r.rbac.requirePerm('equipment:manage')],
      handler: editarEquipamento,
    });

    // DELETAR (manage)
    r.delete('/equipment/deletar/:id', {
      schema: { params: EquipamentoParamsSchema },
      preHandler: [r.rbac.requirePerm('equipment:manage')],
      handler: deletarEquipamento,
    });
  });
}
