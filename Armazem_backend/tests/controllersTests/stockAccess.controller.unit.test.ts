import type {
  FastifyReply,
  FastifyRequest,
  RouteGenericInterface,
} from 'fastify';

import {
  listRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
} from '../../src/controllers/requests.controller'; 

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    usuario: {
      findFirst: jest.fn(), 
    },
    usuarioEstoque: {
      findUnique: jest.fn(), 
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    stockAccessRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    notificacao: {
      create: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    usuarioRole: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock('../../src/lib/rbac-sync', () => ({
  syncUserRolesToRedis: jest.fn(),
}));

import { prisma } from '../../src/lib/prisma';
import { syncUserRolesToRedis } from '../../src/lib/rbac-sync';

// ==== Helpers ====
function mockReply() {
  const reply: Partial<FastifyReply> = {
    status: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return reply as FastifyReply;
}

function mockRequest<
  RG extends RouteGenericInterface = RouteGenericInterface
>(...overrides: Array<Partial<FastifyRequest<RG>>>) {
  const req: Partial<FastifyRequest<RG>> = {
    log: { error: jest.fn() } as any,
    server: {} as any,
  };
  Object.assign(req, ...overrides);
  return req as FastifyRequest<RG>;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('stockAccess.controller', () => {
  // ================= listRequests =================
  describe('listRequests', () => {
    it('lista todas sem filtro', async () => {
      (prisma.stockAccessRequest.findMany as jest.Mock).mockResolvedValue([{ id: 1 }]);
      const reply = mockReply();
      const req = mockRequest({ query: {} } as any);

      await listRequests(req as any, reply);

      expect(prisma.stockAccessRequest.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: { estoque: true, usuario: true, approver: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(reply.send).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('filtra por status=PENDING', async () => {
      (prisma.stockAccessRequest.findMany as jest.Mock).mockResolvedValue([{ id: 2, status: 'PENDING' }]);
      const reply = mockReply();
      const req = mockRequest({ query: { status: 'PENDING' } as any });

      await listRequests(req as any, reply);

      expect(prisma.stockAccessRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'PENDING' } })
      );
      expect(reply.send).toHaveBeenCalledWith([{ id: 2, status: 'PENDING' }]);
    });

    it('500 em erro inesperado', async () => {
      (prisma.stockAccessRequest.findMany as jest.Mock).mockRejectedValue(new Error('db'));
      const reply = mockReply();
      const req = mockRequest({ query: {} } as any);

      await listRequests(req as any, reply);
      expect(reply.code).toHaveBeenCalledWith(500);
    });
  });

  // ================= getRequestById =================
  describe('getRequestById', () => {
    type RG = { Params: { id: string } };

    it('404 quando não existe', async () => {
      (prisma.stockAccessRequest.findUnique as jest.Mock).mockResolvedValue(null);
      const reply = mockReply();
      const req = mockRequest<RG>({ params: { id: '10' } });

      await getRequestById(req, reply);
      expect(reply.code).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Solicitação não encontrada' });
    });

    it('200 quando existe', async () => {
      (prisma.stockAccessRequest.findUnique as jest.Mock).mockResolvedValue({ id: 10 });
      const reply = mockReply();
      const req = mockRequest<RG>({ params: { id: '10' } });

      await getRequestById(req, reply);
      expect(reply.send).toHaveBeenCalledWith({ id: 10 });
    });

    it('500 em erro inesperado', async () => {
      (prisma.stockAccessRequest.findUnique as jest.Mock).mockRejectedValue(new Error('x'));
      const reply = mockReply();
      const req = mockRequest<RG>({ params: { id: '1' } });

      await getRequestById(req, reply);
      expect(reply.code).toHaveBeenCalledWith(500);
    });
  });

  // ================= approveRequest =================
  describe('approveRequest', () => {
    type RG = { Params: { id: string } };

    it('401 quando não autenticado', async () => {
      const reply = mockReply();
      const req = mockRequest<RG>({ user: undefined as any, params: { id: '1' } });

      await approveRequest(req, reply);
      expect(reply.code).toHaveBeenCalledWith(401);
    });

    it('404 quando solicitação não existe', async () => {
      (prisma.stockAccessRequest.findUnique as jest.Mock).mockResolvedValue(null);
      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 9 } } as any, { params: { id: '1' } } as any);

      await approveRequest(req as any, reply);
      expect(reply.code).toHaveBeenCalledWith(404);
    });

    it('409 quando já decidida', async () => {
      (prisma.stockAccessRequest.findUnique as jest.Mock).mockResolvedValue({ id: 1, status: 'APPROVED', estoqueId: 3 });
      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 9 } } as any, { params: { id: '1' } } as any);

      await approveRequest(req as any, reply);
      expect(reply.code).toHaveBeenCalledWith(409);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Solicitação já decidida' });
    });

    it('403 quando sem permissão (não é super nem stock admin)', async () => {
      (prisma.stockAccessRequest.findUnique as jest.Mock).mockResolvedValue({
        id: 1, status: 'PENDING', estoqueId: 5, usuarioId: 77
      });
      // isSuperAdmin -> false
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue(null);
      // isStockAdmin -> role != ADMIN
      (prisma.usuarioEstoque.findUnique as jest.Mock).mockResolvedValue({ role: 'MEMBER' });

      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 9 } } as any, { params: { id: '1' } } as any);

      await approveRequest(req as any, reply);
      expect(reply.code).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Sem permissão para aprovar' });
    });

    it('aprova com sucesso, faz upserts/roles/notifica e sincroniza Redis', async () => {
      (prisma.stockAccessRequest.findUnique as jest.Mock).mockResolvedValue({
        id: 1, status: 'PENDING', estoqueId: 5, usuarioId: 77
      });
      // isSuperAdmin -> true
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue({ id: 9 });

      // mock da transação
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
        const tx = {
          usuarioEstoque: {
            upsert: jest.fn().mockResolvedValue({}),
          },
          role: {
            findUnique: jest
              .fn()
              .mockImplementation(({ where: { nome } }: any) =>
                nome === 'usuarioPadrão' ? { id: 100 } : { id: 200 }
              ),
          },
          usuarioRole: {
            deleteMany: jest.fn().mockResolvedValue({}),
            upsert: jest.fn().mockResolvedValue({}),
          },
          stockAccessRequest: {
            update: jest.fn().mockResolvedValue({ id: 1, status: 'APPROVED' }),
          },
          notificacao: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return cb(tx);
      });

      (syncUserRolesToRedis as jest.Mock).mockResolvedValue(undefined);

      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 9 } } as any, { params: { id: '1' } } as any);

      await approveRequest(req as any, reply);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(syncUserRolesToRedis).toHaveBeenCalledWith(req.server, 77);
      expect(reply.send).toHaveBeenCalledWith({
        ok: true,
        request: { id: 1, status: 'APPROVED' },
      });
    });

    it('se notificação falhar dentro da transação, retorna 500 (ramo .catch)', async () => {
      (prisma.stockAccessRequest.findUnique as jest.Mock).mockResolvedValue({
        id: 1, status: 'PENDING', estoqueId: 5, usuarioId: 77
      });
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue({ id: 9 });

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
        const tx = {
          usuarioEstoque: { upsert: jest.fn().mockResolvedValue({}) },
          role: {
            findUnique: jest
              .fn()
              .mockImplementation(({ where: { nome } }: any) =>
                nome === 'usuarioPadrão' ? { id: 100 } : { id: 200 }
              ),
          },
          usuarioRole: { deleteMany: jest.fn(), upsert: jest.fn() },
          stockAccessRequest: { update: jest.fn().mockResolvedValue({ id: 1, status: 'APPROVED' }) },
          notificacao: {
            create: jest.fn().mockRejectedValue(new Error('smtp')),
          },
        };
        // callback da transação chama reply.code(500).send(...) no catch da controller
        return cb(tx);
      });

      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 9 } } as any, { params: { id: '1' } } as any);

      await approveRequest(req as any, reply);

      expect(reply.code).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Erro ao notificar aprovação' });
    });

    it('500 em erro inesperado', async () => {
      (prisma.stockAccessRequest.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 9 } } as any, { params: { id: '1' } } as any);

      await approveRequest(req as any, reply);
      expect(reply.code).toHaveBeenCalledWith(500);
    });
  });

  // ================= rejectRequest =================
  describe('rejectRequest', () => {
    type RG = { Params: { id: string } };

    it('401 quando não autenticado', async () => {
      const reply = mockReply();
      const req = mockRequest<RG>({ user: undefined as any, params: { id: '1' } });

      await rejectRequest(req, reply);
      expect(reply.code).toHaveBeenCalledWith(401);
    });

    it('404 quando não existe', async () => {
      (prisma.stockAccessRequest.findUnique as jest.Mock).mockResolvedValue(null);
      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 9 } } as any, { params: { id: '1' } } as any);

      await rejectRequest(req as any, reply);
      expect(reply.code).toHaveBeenCalledWith(404);
    });

    it('409 quando já decidida', async () => {
      (prisma.stockAccessRequest.findUnique as jest.Mock).mockResolvedValue({
        id: 1, status: 'REJECTED', estoqueId: 5, usuarioId: 77
      });
      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 9 } } as any, { params: { id: '1' } } as any);

      await rejectRequest(req as any, reply);
      expect(reply.code).toHaveBeenCalledWith(409);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Solicitação já decidida' });
    });

    it('403 quando sem permissão', async () => {
      (prisma.stockAccessRequest.findUnique as jest.Mock).mockResolvedValue({
        id: 1, status: 'PENDING', estoqueId: 5, usuarioId: 77
      });
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue(null); // not super
      (prisma.usuarioEstoque.findUnique as jest.Mock).mockResolvedValue({ role: 'MEMBER' }); // not stock admin

      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 9 } } as any, { params: { id: '1' } } as any);

      await rejectRequest(req as any, reply);
      expect(reply.code).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Sem permissão para rejeitar' });
    });

    it('rejeita com sucesso e notifica (ignorando erro no create)', async () => {
      (prisma.stockAccessRequest.findUnique as jest.Mock).mockResolvedValue({
        id: 1, status: 'PENDING', estoqueId: 5, usuarioId: 77
      });
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue({ id: 9 }); // super admin
      (prisma.stockAccessRequest.update as jest.Mock).mockResolvedValue({ id: 1, status: 'REJECTED' });
      (prisma.notificacao.create as jest.Mock).mockRejectedValue(new Error('smtp')); // é ignorado

      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 9 } } as any, { params: { id: '1' } } as any);

      await rejectRequest(req as any, reply);
      expect(prisma.stockAccessRequest.update).toHaveBeenCalled();
      expect(reply.send).toHaveBeenCalledWith({ ok: true, request: { id: 1, status: 'REJECTED' } });
    });

    it('500 em erro inesperado', async () => {
      (prisma.stockAccessRequest.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 9 } } as any, { params: { id: '1' } } as any);

      await rejectRequest(req as any, reply);
      expect(reply.code).toHaveBeenCalledWith(500);
    });
  });
});
