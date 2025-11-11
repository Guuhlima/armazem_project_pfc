// tests/controllers/alerts.controller.unit.test.ts
import type {
  FastifyReply,
  FastifyRequest,
  RouteGenericInterface,
} from 'fastify';

import {
  listarItensAbaixoDoMinimo,
  listarAlertasAbertos,
} from '../../src/controllers/stockAlerts.controller';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    estoqueItem: {
      findMany: jest.fn(),
    },
    alertaEstoque: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '../../src/lib/prisma';

function mockReply() {
  const reply: Partial<FastifyReply> = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return reply as FastifyReply;
}

function mockRequest<
  RG extends RouteGenericInterface = RouteGenericInterface
>(override?: Partial<FastifyRequest<RG>>) {
  const req: Partial<FastifyRequest<RG>> = {
    log: { error: jest.fn() } as any,
    ...override,
  };
  return req as FastifyRequest<RG>;
}

describe('controllers/alerts.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('listarItensAbaixoDoMinimo', () => {
    type RG = { Params: { estoqueId: string } };

    it('retorna 200 com itens abaixo (quantidade <= minimo)', async () => {
      (prisma.estoqueItem.findMany as jest.Mock).mockResolvedValue([
        { id: 1, estoqueId: 10, quantidade: 3, minimo: 5, item: { id: 100, nome: 'Mouse' } },
        { id: 2, estoqueId: 10, quantidade: 5, minimo: 5, item: { id: 101, nome: 'Teclado' } },
        { id: 3, estoqueId: 10, quantidade: 7, minimo: 5, item: { id: 102, nome: 'Cabo' } },
      ]);

      const reply = mockReply();
      const req = mockRequest<RG>({ params: { estoqueId: '10' } });

      await listarItensAbaixoDoMinimo(req, reply);

      expect(prisma.estoqueItem.findMany).toHaveBeenCalledWith({
        where: { estoqueId: 10 },
        include: { item: true },
      });

      expect(reply.send).toHaveBeenCalledWith([
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: 2 }),
      ]);
    });

    it('em erro inesperado, retorna 500', async () => {
      (prisma.estoqueItem.findMany as jest.Mock).mockRejectedValue(
        new Error('db down')
      );

      const reply = mockReply();
      const req = mockRequest<RG>({ params: { estoqueId: '10' } });

      await listarItensAbaixoDoMinimo(req, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({
        error: 'Erro ao listar itens abaixo do mínimo',
      });
    });

    it('parseia estoqueId como número (NaN vira where: { estoqueId: NaN })', async () => {
      (prisma.estoqueItem.findMany as jest.Mock).mockResolvedValue([]);

      const reply = mockReply();
      const req = mockRequest<RG>({ params: { estoqueId: 'xyz' } });

      await listarItensAbaixoDoMinimo(req, reply);

      expect(prisma.estoqueItem.findMany).toHaveBeenCalledWith({
        where: { estoqueId: NaN },
        include: { item: true },
      });
      expect(reply.send).toHaveBeenCalledWith([]);
    });
  });

  describe('listarAlertasAbertos', () => {
    type RG = { Params: { estoqueId: string } };

    it('retorna 200 com alertas abertos em ordem desc', async () => {
      (prisma.alertaEstoque.findMany as jest.Mock).mockResolvedValue([
        {
          id: 11,
          estoqueId: 10,
          resolvido: false,
          createdAt: new Date('2025-01-01'),
          estoqueItem: { id: 1, item: { id: 100, nome: 'Mouse' } },
        },
      ]);

      const reply = mockReply();
      const req = mockRequest<RG>({ params: { estoqueId: '10' } });

      await listarAlertasAbertos(req, reply);

      expect(prisma.alertaEstoque.findMany).toHaveBeenCalledWith({
        where: { estoqueId: 10, resolvido: false },
        orderBy: { createdAt: 'desc' },
        include: { estoqueItem: { include: { item: true } } },
      });
      expect(reply.send).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 11 })])
      );
    });

    it('em erro inesperado, retorna 500', async () => {
      (prisma.alertaEstoque.findMany as jest.Mock).mockRejectedValue(
        new Error('boom')
      );

      const reply = mockReply();
      const req = mockRequest<RG>({ params: { estoqueId: '10' } });

      await listarAlertasAbertos(req, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Erro ao listar alertas' });
    });
  });
});
