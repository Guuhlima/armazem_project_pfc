import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma';
import { syncUserRolesToRedis } from '../lib/rbac-sync';

async function isSuperAdmin(userId: number) {
  const u = await prisma.usuario.findFirst({
    where: { id: userId, roles: { some: { role: { nome: 'SUPER-ADMIN' } } } },
    select: { id: true },
  });
  return !!u;
}
async function isStockAdmin(userId: number, estoqueId: number) {
  const v = await prisma.usuarioEstoque.findUnique({
    where: { usuarioId_estoqueId: { usuarioId: userId, estoqueId } },
    select: { role: true },
  });
  return v?.role === 'ADMIN';
}

export async function listRequests(req: FastifyRequest, reply: FastifyReply) {
  try {
    const status = (req.query as any)?.status as 'PENDING'|'APPROVED'|'REJECTED'|undefined;

    const items = await prisma.stockAccessRequest.findMany({
      where: status ? { status } : undefined,
      include: { estoque: true, usuario: true, approver: true },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(items);
  } catch (err) {
    req.log.error({ err }, 'listRequests error');
    return reply.code(500).send({ error: 'Erro ao listar solicitações' });
  }
}

export async function getRequestById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const id = Number(req.params.id);
    const item = await prisma.stockAccessRequest.findUnique({
      where: { id },
      include: { estoque: true, usuario: true, approver: true },
    });
    if (!item) return reply.code(404).send({ error: 'Solicitação não encontrada' });
    return reply.send(item);
  } catch (err) {
    req.log.error({ err }, 'getRequestById error');
    return reply.code(500).send({ error: 'Erro ao buscar solicitação' });
  }
}

export async function approveRequest(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const approverId = Number((req.user as any)?.id);
    if (!approverId) return reply.code(401).send({ error: 'não autenticado' });

    const id = Number(req.params.id);
    const item = await prisma.stockAccessRequest.findUnique({ where: { id } });
    if (!item) return reply.code(404).send({ error: 'Solicitação não encontrada' });
    if (item.status !== 'PENDING') {
      return reply.code(409).send({ error: 'Solicitação já decidida' });
    }

    const [superA, stockA] = await Promise.all([
      isSuperAdmin(approverId),
      isStockAdmin(approverId, item.estoqueId),
    ]);
    if (!superA && !stockA) return reply.code(403).send({ error: 'Sem permissão para aprovar' });

    const result = await prisma.$transaction(async (tx) => {
      await tx.usuarioEstoque.upsert({
        where: { usuarioId_estoqueId: { usuarioId: item.usuarioId, estoqueId: item.estoqueId } },
        update: { role: 'MEMBER' },
        create: { usuarioId: item.usuarioId, estoqueId: item.estoqueId, role: 'MEMBER' },
      });

      const [roleUsuarioPadrao, roleUserEquip] = await Promise.all([
        tx.role.findUnique({ where: { nome: 'usuarioPadrão' } }),
        tx.role.findUnique({ where: { nome: 'USER-EQUIPAMENTOS' } }),
      ]);
      if (!roleUserEquip) throw new Error('Role USER-EQUIPAMENTOS não encontrada (seeds).');

      if (roleUsuarioPadrao) {
        await tx.usuarioRole.deleteMany({
          where: { usuarioId: item.usuarioId, roleId: roleUsuarioPadrao.id },
        });
      }
      await tx.usuarioRole.upsert({
        where: { usuarioId_roleId: { usuarioId: item.usuarioId, roleId: roleUserEquip.id } },
        update: {},
        create: { usuarioId: item.usuarioId, roleId: roleUserEquip.id },
      });

      const updatedReq = await tx.stockAccessRequest.update({
        where: { id },
        data: { status: 'APPROVED', approverId, decidedAt: new Date() },
      });

      await tx.notificacao.create({
        data: {
          userId: item.usuarioId,
          type: 'ACCESS_APPROVED',
          title: 'Acesso ao armazém aprovado',
          message: `Seu acesso ao armazém ${item.estoqueId} foi aprovado.`,
          refId: id,
        },
      }).catch(() => {
        return reply.code(500).send({ error: 'Erro ao notificar aprovação'})
       });

      return { updatedReq, usuarioId: item.usuarioId };
    });

    await syncUserRolesToRedis(req.server, result.usuarioId);

    return reply.send({ ok: true, request: result.updatedReq });
  } catch (err) {
    req.log.error({ err }, 'approveRequest error');
    return reply.code(500).send({ error: 'Erro ao aprovar solicitação' });
  }
}

export async function rejectRequest(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const approverId = Number((req.user as any)?.id);
    if (!approverId) return reply.code(401).send({ error: 'não autenticado' });

    const id = Number(req.params.id);
    const item = await prisma.stockAccessRequest.findUnique({ where: { id } });
    if (!item) return reply.code(404).send({ error: 'Solicitação não encontrada' });
    if (item.status !== 'PENDING') {
      return reply.code(409).send({ error: 'Solicitação já decidida' });
    }

    const [superA, stockA] = await Promise.all([
      isSuperAdmin(approverId),
      isStockAdmin(approverId, item.estoqueId),
    ]);
    if (!superA && !stockA) return reply.code(403).send({ error: 'Sem permissão para rejeitar' });

    const updated = await prisma.stockAccessRequest.update({
      where: { id },
      data: { status: 'REJECTED', approverId, decidedAt: new Date() },
    });

    await prisma.notificacao.create({
      data: {
        userId: item.usuarioId,
        type: 'ACCESS_REJECTED',
        title: 'Acesso ao armazém rejeitado',
        message: `Seu acesso ao armazém ${item.estoqueId} foi rejeitado.`,
        refId: id,
      },
    }).catch(() => {});

    return reply.send({ ok: true, request: updated });
  } catch (err) {
    req.log.error({ err }, 'rejectRequest error');
    return reply.code(500).send({ error: 'Erro ao rejeitar solicitação' });
  }
}
