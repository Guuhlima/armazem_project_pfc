import { adicionarItemAoEstoque, visualizarItensDoEstoque, visualizarQuantidadePorItemNoEstoque } from '../../src/controllers/stockItens.controller'; // ⬅️ ajuste o caminho
import type {
  FastifyReply,
  FastifyRequest,
  RouteGenericInterface,
} from 'fastify';

jest.mock('../../src/lib/prisma', () => {
  return {
    prisma: {
      estoqueItem: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    },
  };
});

jest.mock('../../src/service/estoque-alertas.service', () => ({
  checarLimitesEGerenciarAlertas: jest.fn(),
}));

import { prisma } from '../../src/lib/prisma'; 
import { checarLimitesEGerenciarAlertas } from '../../src/service/estoque-alertas.service';

function mockReply() {
  const reply: Partial<FastifyReply> = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return reply as FastifyReply;
}

function mockRequest<
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface
>(override?: Partial<FastifyRequest<RouteGeneric>>) {
  const req: Partial<FastifyRequest<RouteGeneric>> = {
    log: { error: jest.fn() } as any,
    ...override,
  };
  return req as FastifyRequest<RouteGeneric>;
}

describe('controllers/stockItens.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('adicionarItemAoEstoque', () => {
    it('retorna 400 quando estoqueId é inválido', async () => {
      const reply = mockReply();
      const req = mockRequest<{ Params: { id: string }, Body: any }>({
        params: { id: 'abc' } as any,
        body: { itemId: 1, quantidade: 2 },
      });

      await adicionarItemAoEstoque(req, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'estoqueId inválido' });
      expect(prisma.estoqueItem.upsert).not.toHaveBeenCalled();
    });

    it('retorna 400 quando itemId é inválido', async () => {
      const reply = mockReply();
      const req = mockRequest({
        params: { id: '10' },
        body: { itemId: 0, quantidade: 2 },
      });

      await adicionarItemAoEstoque(req as any, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'itemId inválido' });
      expect(prisma.estoqueItem.upsert).not.toHaveBeenCalled();
    });

    it('retorna 400 quando quantidade <= 0', async () => {
      const reply = mockReply();
      const req = mockRequest({
        params: { id: '10' },
        body: { itemId: 2, quantidade: 0 },
      });

      await adicionarItemAoEstoque(req as any, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Quantidade deve ser maior que zero' });
      expect(prisma.estoqueItem.upsert).not.toHaveBeenCalled();
    });

    it('faz upsert, chama checarLimitesEGerenciarAlertas e retorna 200 com payload (sem minimo)', async () => {
      (prisma.estoqueItem.upsert as jest.Mock).mockResolvedValue({
        id: 1,
        itemId: 5,
        estoqueId: 10,
        quantidade: 12,
        item: { id: 5, nome: 'Item X' },
        estoque: { id: 10, nome: 'Estoque Y' },
      });

      const reply = mockReply();
      const req = mockRequest({
        params: { id: '10' },
        body: { itemId: 5, quantidade: 12 },
      });

      await adicionarItemAoEstoque(req as any, reply);

      expect(prisma.estoqueItem.upsert).toHaveBeenCalledWith({
        where: { itemId_estoqueId: { itemId: 5, estoqueId: 10 } },
        update: {
          quantidade: { increment: 12 },
        },
        create: {
          itemId: 5,
          estoqueId: 10,
          quantidade: 12,
          minimo: undefined,
        },
        include: { item: true, estoque: true },
      });

      expect(checarLimitesEGerenciarAlertas).toHaveBeenCalledWith(10, 5);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ itemId: 5, estoqueId: 10, quantidade: 12 })
      );
      expect(reply.status).not.toHaveBeenCalledWith(500);
    });

    it('inclui "minimo" quando informado', async () => {
      (prisma.estoqueItem.upsert as jest.Mock).mockResolvedValue({ ok: true });

      const reply = mockReply();
      const req = mockRequest({
        params: { id: '7' },
        body: { itemId: 3, quantidade: 2, minimo: 9 },
      });

      await adicionarItemAoEstoque(req as any, reply);

      expect(prisma.estoqueItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ minimo: 9 }),
          create: expect.objectContaining({ minimo: 9 }),
        })
      );
      expect(checarLimitesEGerenciarAlertas).toHaveBeenCalledWith(7, 3);
      expect(reply.send).toHaveBeenCalledWith({ ok: true });
    });

    it('em erro inesperado, loga e retorna 500', async () => {
      (prisma.estoqueItem.upsert as jest.Mock).mockRejectedValue(new Error('boom'));

      const reply = mockReply();
      const req = mockRequest({
        params: { id: '1' },
        body: { itemId: 1, quantidade: 1 },
      });

      await adicionarItemAoEstoque(req as any, reply);

      expect((req.log as any).error).toHaveBeenCalled();
      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Erro ao adicionar item ao estoque' });
    });
  });

  describe('visualizarItensDoEstoque', () => {
    it('retorna 400 quando estoqueId é inválido', async () => {
      const reply = mockReply();
      const req = mockRequest({ params: { id: 'zero' } });

      await visualizarItensDoEstoque(req as any, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'estoqueId inválido' });
      expect(prisma.estoqueItem.findMany).not.toHaveBeenCalled();
    });

    it('retorna 200 com lista de itens (com include e order)', async () => {
      (prisma.estoqueItem.findMany as jest.Mock).mockResolvedValue([
        { itemId: 1, estoqueId: 10, item: { nome: 'A' }, estoque: { id: 10 } },
        { itemId: 2, estoqueId: 10, item: { nome: 'B' }, estoque: { id: 10 } },
      ]);

      const reply = mockReply();
      const req = mockRequest({ params: { id: '10' } });

      await visualizarItensDoEstoque(req as any, reply);

      expect(prisma.estoqueItem.findMany).toHaveBeenCalledWith({
        where: { estoqueId: 10 },
        include: { item: true, estoque: true },
        orderBy: [{ item: { nome: 'asc' } }, { itemId: 'asc' }],
      });
      expect(reply.send).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ itemId: 1 }),
          expect.objectContaining({ itemId: 2 }),
        ])
      );
    });

    it('em erro inesperado, loga e retorna 500', async () => {
      (prisma.estoqueItem.findMany as jest.Mock).mockRejectedValue(new Error('db off'));

      const reply = mockReply();
      const req = mockRequest({ params: { id: '10' } });

      await visualizarItensDoEstoque(req as any, reply);

      expect((req.log as any).error).toHaveBeenCalled();
      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Erro ao listar itens do estoque' });
    });
  });

  describe('visualizarQuantidadePorItemNoEstoque', () => {
    it('retorna 400 quando estoqueId é inválido', async () => {
      const reply = mockReply();
      const req = mockRequest({ params: { estoqueId: 'x', itemId: '2' } });

      await visualizarQuantidadePorItemNoEstoque(req as any, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'estoqueId inválido' });
      expect(prisma.estoqueItem.findUnique).not.toHaveBeenCalled();
    });

    it('retorna 400 quando itemId é inválido', async () => {
      const reply = mockReply();
      const req = mockRequest({ params: { estoqueId: '10', itemId: '0' } });

      await visualizarQuantidadePorItemNoEstoque(req as any, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'itemId inválido' });
      expect(prisma.estoqueItem.findUnique).not.toHaveBeenCalled();
    });

    it('retorna quantidade do registro quando existe', async () => {
      (prisma.estoqueItem.findUnique as jest.Mock).mockResolvedValue({ quantidade: 7 });

      const reply = mockReply();
      const req = mockRequest({ params: { estoqueId: '10', itemId: '5' } });

      await visualizarQuantidadePorItemNoEstoque(req as any, reply);

      expect(prisma.estoqueItem.findUnique).toHaveBeenCalledWith({
        where: { itemId_estoqueId: { itemId: 5, estoqueId: 10 } },
        select: { quantidade: true },
      });
      expect(reply.send).toHaveBeenCalledWith({ quantidade: 7 });
    });

    it('quando não existe registro, retorna quantidade 0', async () => {
      (prisma.estoqueItem.findUnique as jest.Mock).mockResolvedValue(null);

      const reply = mockReply();
      const req = mockRequest({ params: { estoqueId: '10', itemId: '99' } });

      await visualizarQuantidadePorItemNoEstoque(req as any, reply);

      expect(reply.send).toHaveBeenCalledWith({ quantidade: 0 });
    });

    it('em erro inesperado, loga e retorna 500', async () => {
      (prisma.estoqueItem.findUnique as jest.Mock).mockRejectedValue(new Error('boom'));

      const reply = mockReply();
      const req = mockRequest({ params: { estoqueId: '10', itemId: '1' } });

      await visualizarQuantidadePorItemNoEstoque(req as any, reply);

      expect((req.log as any).error).toHaveBeenCalled();
      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Erro ao buscar quantidade' });
    });
  });
});
