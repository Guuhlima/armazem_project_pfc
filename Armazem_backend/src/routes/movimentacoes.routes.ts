import { FastifyInstance } from "fastify";
import { relatorioMovimentacoesController } from "controllers/movimentacoes.controller";
import { MovQuerySchema } from "schemas/movimentacoes.schema";

export async function movimentacoesRoutes(app: FastifyInstance) {
    app.addHook('onRequest', app.authenticate);

    app.get('/movimentacoes/relatorio', {
        schema: {
            querystring: MovQuerySchema,
            tags: ['Movimentações'],
            summary: 'Relatório consolidado de movimentações (real + projetado) com saldo e ATP',
        },
        preHandler: [app.rbac.requirePerm('transfer:manage')],
        handler: relatorioMovimentacoesController,
    });
}