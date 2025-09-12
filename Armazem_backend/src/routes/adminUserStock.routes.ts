// src/routes/adminUserStock.routes.ts
import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';

export async function adminUserStockRoutes(app: FastifyInstance) {
  app.register(async (r) => {
    r.addHook('onRequest', r.authenticate);

    r.get('/admin/usuarios/:userId/estoques/:estoqueId/role', {
      preHandler: [r.rbac.requirePerm('user:manage')],
      handler: async (req: any, reply) => {
        const userId = Number(req.params.userId);
        const estoqueId = Number(req.params.estoqueId);

        const row = await prisma.usuarioEstoque.findUnique({
          where: { usuarioId_estoqueId: { usuarioId: userId, estoqueId } },
          select: { role: true },
        });

        if (row?.role) {
          return reply.send({ role: row.role, inherited: false });
        }

        const superAdmin = await prisma.usuarioRole.findFirst({
          where: {
            usuarioId: userId,
            role: { nome: 'SUPER-ADMIN' },
          },
          select: { usuarioId: true },
        });

        if (superAdmin) {
          return reply.send({ role: 'ADMIN', inherited: true });
        }

        return reply.send({ role: null });
      },
    });

    r.put('/admin/usuarios/:userId/estoques/:estoqueId/role', {
      preHandler: [r.rbac.requirePerm('user:manage')],
      handler: async (req: any, reply) => {
        const userId = Number(req.params.userId);
        const estoqueId = Number(req.params.estoqueId);
        const { role } = (req.body ?? {}) as { role?: 'ADMIN' | 'MEMBER' };
        if (role !== 'ADMIN' && role !== 'MEMBER') {
          return reply.code(400).send({ error: 'role inválido' });
        }

        await prisma.usuarioEstoque.upsert({
          where: { usuarioId_estoqueId: { usuarioId: userId, estoqueId } },
          create: { usuarioId: userId, estoqueId, role },
          update: { role },
        });

        reply.send({ ok: true });
      },
    });
  });
}
