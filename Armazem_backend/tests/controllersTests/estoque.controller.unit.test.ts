// tests/controllers/estoque.controller.unit.test.ts
import type {
  FastifyReply,
  FastifyRequest,
  RouteGenericInterface,
} from 'fastify';

import {
  cadastrarEstoque,
  visualizarEstoque,
  visualizarEstoquePorId,
  editarEstoque,
  deletarEstoque,
  visualizarItensPorEstoque,
  meusEstoques,
  definirMinimoItemNoEstoque,
  vincularMeAoEstoque,
  desvincularMeDoEstoque,
  vincularUsuarioAoEstoque,
  desvincularUsuarioDoEstoque,
  listarEstoquesDisponiveis,
  solicitarAcessoAoEstoque,
  getSugerirFEFO,
  postPickingFEFO,
  postSaidaSerial,
  getEstoqueItemConfig,
  patchEstoqueItemAutoConfig,
} from '../../src/controllers/stock.controller';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    estoque: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    estoqueItem: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    usuarioEstoque: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    usuario: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    notificacao: {
      createMany: jest.fn(),
    },
    stockAccessRequest: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));
jest.mock('../../src/service/estoque-alertas.service', () => ({
  checarLimitesEGerenciarAlertas: jest.fn(),
}));
jest.mock('../../src/service/estoque.service', () => ({
  sugerirFEFO: jest.fn(),
  pickingFEFO: jest.fn(),
  saidaPorSerial: jest.fn(),
}));

import { prisma } from '../../src/lib/prisma';
import { checarLimitesEGerenciarAlertas } from '../../src/service/estoque-alertas.service';
import { sugerirFEFO, pickingFEFO, saidaPorSerial } from '../../src/service/estoque.service';

// ---- Helpers ----
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
  };
  Object.assign(req, ...overrides);
  return req as FastifyRequest<RG>;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('estoque.controller', () => {
  describe('cadastrarEstoque', () => {
    type RG = { Body: { nome: string } };

    it('cria e retorna o estoque', async () => {
      (prisma.estoque.create as jest.Mock).mockResolvedValue({ id: 1, nome: 'Main' });
      const reply = mockReply();
      const req = mockRequest<RG>({ body: { nome: 'Main' } });

      await cadastrarEstoque(req, reply);

      expect(prisma.estoque.create).toHaveBeenCalledWith({ data: { nome: 'Main' } });
      expect(reply.send).toHaveBeenCalledWith({ id: 1, nome: 'Main' });
    });

    it('erro 500', async () => {
      (prisma.estoque.create as jest.Mock).mockRejectedValue(new Error('db'));
      const reply = mockReply();
      const req = mockRequest<RG>({ body: { nome: 'X' } });

      await cadastrarEstoque(req, reply);
      expect(reply.status).toHaveBeenCalledWith(500);
    });
  });

  describe('visualizarEstoque', () => {
    it('lista estoques', async () => {
      (prisma.estoque.findMany as jest.Mock).mockResolvedValue([{ id: 1 }]);
      const reply = mockReply();

      await visualizarEstoque({} as any, reply);
      expect(prisma.estoque.findMany).toHaveBeenCalled();
      expect(reply.send).toHaveBeenCalledWith([{ id: 1 }]);
    });
  });

  describe('visualizarEstoquePorId', () => {
    type RG = { Params: { id: string } };

    it('404 quando não existe', async () => {
      (prisma.estoque.findUnique as jest.Mock).mockResolvedValue(null);
      const reply = mockReply();
      const req = mockRequest<RG>({ params: { id: '10' } });

      await visualizarEstoquePorId(req, reply);
      expect(reply.status).toHaveBeenCalledWith(404);
    });

    it('200 quando existe', async () => {
      (prisma.estoque.findUnique as jest.Mock).mockResolvedValue({ id: 10, nome: 'A' });
      const reply = mockReply();
      const req = mockRequest<RG>({ params: { id: '10' } });

      await visualizarEstoquePorId(req, reply);
      expect(reply.send).toHaveBeenCalledWith({ id: 10, nome: 'A' });
    });
  });

  describe('editarEstoque', () => {
    type RG = { Params: { id: string }; Body: { nome: string } };

    it('edita e retorna', async () => {
      (prisma.estoque.update as jest.Mock).mockResolvedValue({ id: 5, nome: 'Novo' });
      const reply = mockReply();
      const req = mockRequest<RG>({ params: { id: '5' }, body: { nome: 'Novo' } });

      await editarEstoque(req, reply);
      expect(prisma.estoque.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { nome: 'Novo' },
      });
      expect(reply.send).toHaveBeenCalledWith({ id: 5, nome: 'Novo' });
    });
  });

  describe('deletarEstoque', () => {
    type RG = { Params: { id: string } };

    it('deleta e retorna', async () => {
      (prisma.estoque.delete as jest.Mock).mockResolvedValue({ id: 8 });
      const reply = mockReply();
      const req = mockRequest<RG>({ params: { id: '8' } });

      await deletarEstoque(req, reply);
      expect(reply.send).toHaveBeenCalledWith({ id: 8 });
    });

    it('404 quando P2025 (not found)', async () => {
      (prisma.estoque.delete as jest.Mock).mockRejectedValue({ code: 'P2025' });
      const reply = mockReply();
      const req = mockRequest<RG>({ params: { id: '123' } });

      await deletarEstoque(req, reply);
      expect(reply.status).toHaveBeenCalledWith(404);
    });
  });

  describe('visualizarItensPorEstoque', () => {
    type RG = { Params: { id: string } };

    it('404 se estoque não existe', async () => {
      (prisma.estoque.findUnique as jest.Mock).mockResolvedValue(null);
      const reply = mockReply();
      const req = mockRequest<RG>({ params: { id: '1' } });

      await visualizarItensPorEstoque(req, reply);
      expect(reply.status).toHaveBeenCalledWith(404);
    });

    it('retorna itens incluídos', async () => {
      (prisma.estoque.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        itens: [{ itemId: 10, item: { nome: 'Mouse' } }],
      });
      const reply = mockReply();
      const req = mockRequest<RG>({ params: { id: '1' } });

      await visualizarItensPorEstoque(req, reply);
      expect(prisma.estoque.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { itens: { include: { item: true } } },
      });
      expect(reply.send).toHaveBeenCalledWith([{ itemId: 10, item: { nome: 'Mouse' } }]);
    });
  });

  describe('meusEstoques', () => {
    it('401 se não autenticado', async () => {
      const reply = mockReply();
      const req = mockRequest({ user: undefined } as any);

      await meusEstoques(req as any, reply);
      expect(reply.code).toHaveBeenCalledWith(401);
    });

    it('retorna warehouses do usuário', async () => {
      (prisma.usuarioEstoque.findMany as jest.Mock).mockResolvedValue([
        { estoque: { id: 1, nome: 'Main' } },
        { estoque: { id: 2, nome: 'Sec' } },
      ]);

      const reply = mockReply();
      const req = mockRequest({ user: { id: 77 } } as any);

      await meusEstoques(req as any, reply);
      expect(reply.send).toHaveBeenCalledWith({
        warehouses: [
          { id: 1, nome: 'Main' },
          { id: 2, nome: 'Sec' },
        ],
      });
    });
  });

  describe('definirMinimoItemNoEstoque', () => {
    type RG = { Params: { estoqueId: string; itemId: string }; Body: { minimo: number } };

    it('upsert + chama checar limites', async () => {
      (prisma.estoqueItem.upsert as jest.Mock).mockResolvedValue({ ok: true });
      (checarLimitesEGerenciarAlertas as jest.Mock).mockResolvedValue(undefined);

      const reply = mockReply();
      const req = mockRequest<RG>({ params: { estoqueId: '10', itemId: '5' }, body: { minimo: 3 } });

      await definirMinimoItemNoEstoque(req, reply);
      expect(prisma.estoqueItem.upsert).toHaveBeenCalledWith({
        where: { itemId_estoqueId: { itemId: 5, estoqueId: 10 } },
        update: { minimo: 3 },
        create: { itemId: 5, estoqueId: 10, quantidade: 0, minimo: 3 },
      });
      expect(checarLimitesEGerenciarAlertas).toHaveBeenCalledWith(10, 5);
      expect(reply.send).toHaveBeenCalledWith({ ok: true });
    });
  });

  describe('vincularMeAoEstoque', () => {
    type RG = { Params: { id: string } };

    it('401 sem user', async () => {
      const reply = mockReply();
      const req = mockRequest<RG>({ user: undefined as any, params: { id: '1' } });
      await vincularMeAoEstoque(req, reply);
      expect(reply.code).toHaveBeenCalledWith(401);
    });

    it('404 estoque inexistente', async () => {
      (prisma.estoque.findUnique as jest.Mock).mockResolvedValue(null);
      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 9 } } as any, { params: { id: '1' } } as any);
      (req as any).params = { id: '1' };

      await vincularMeAoEstoque(req as any, reply);
      expect(reply.code).toHaveBeenCalledWith(404);
    });

    it('vincula com sucesso', async () => {
      (prisma.estoque.findUnique as jest.Mock).mockResolvedValue({ id: 1, nome: 'Main' });
      (prisma.usuarioEstoque.upsert as jest.Mock).mockResolvedValue({});
      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 9 } } as any, { params: { id: '1' } } as any);
      (req as any).params = { id: '1' };

      await vincularMeAoEstoque(req as any, reply);
      expect(reply.send).toHaveBeenCalledWith({
        ok: true,
        message: 'Vinculado com sucesso',
        estoque: { id: 1, nome: 'Main' },
      });
    });
  });

  describe('desvincularMeDoEstoque', () => {
    type RG = { Params: { id: string } };

    it('401 sem user', async () => {
      const reply = mockReply();
      const req = mockRequest<RG>({ user: undefined as any, params: { id: '1' } });

      await desvincularMeDoEstoque(req, reply);
      expect(reply.code).toHaveBeenCalledWith(401);
    });

    it('ok mesmo se delete lançar e for pego', async () => {
      (prisma.usuarioEstoque.delete as jest.Mock).mockRejectedValue(new Error('x'));
      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 9 } } as any, { params: { id: '1' } } as any);
      (req as any).params = { id: '1' };

      await desvincularMeDoEstoque(req as any, reply);
      expect(reply.send).toHaveBeenCalledWith({ ok: true, message: 'Desvinculado com sucesso' });
    });
  });

  describe('vincularUsuarioAoEstoque', () => {
    type RG = { Params: { userId: string; estoqueId: string } };

    it('404 quando user inexistente', async () => {
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.estoque.findUnique as jest.Mock).mockResolvedValueOnce({ id: 2 });

      const reply = mockReply();
      const req = mockRequest<RG>({ params: { userId: '7', estoqueId: '2' } });

      await vincularUsuarioAoEstoque(req, reply);
      expect(reply.code).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Usuário não encontrado' });
    });

    it('cria vínculo', async () => {
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValueOnce({ id: 7 });
      (prisma.estoque.findUnique as jest.Mock).mockResolvedValueOnce({ id: 2 });
      (prisma.usuarioEstoque.upsert as jest.Mock).mockResolvedValue({});

      const reply = mockReply();
      const req = mockRequest<RG>({ params: { userId: '7', estoqueId: '2' } });

      await vincularUsuarioAoEstoque(req, reply);
      expect(reply.send).toHaveBeenCalledWith({
        ok: true,
        message: 'Vínculo criado',
        usuarioId: 7,
        estoqueId: 2,
      });
    });
  });

  describe('desvincularUsuarioDoEstoque', () => {
    type RG = { Params: { userId: string; estoqueId: string } };

    it('retorna 500 quando catch interno dispara reply 500', async () => {
      (prisma.usuarioEstoque.delete as jest.Mock).mockRejectedValue(new Error('x'));
      const reply = mockReply();
      const req = mockRequest<RG>({ params: { userId: '1', estoqueId: '2' } });

      await desvincularUsuarioDoEstoque(req, reply);
      expect(reply.code).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Erro ao deletar usuario do estoque' });
    });

    it('remove vínculo', async () => {
      (prisma.usuarioEstoque.delete as jest.Mock).mockResolvedValue({});
      const reply = mockReply();
      const req = mockRequest<RG>({ params: { userId: '1', estoqueId: '2' } });

      await desvincularUsuarioDoEstoque(req, reply);
      expect(reply.send).toHaveBeenCalledWith({
        ok: true,
        message: 'Vínculo removido',
        usuarioId: 1,
        estoqueId: 2,
      });
    });
  });

  describe('listarEstoquesDisponiveis', () => {
    it('401 sem user', async () => {
      const reply = mockReply();
      const req = mockRequest({ user: undefined } as any);

      await listarEstoquesDisponiveis(req as any, reply);
      expect(reply.code).toHaveBeenCalledWith(401);
    });

    it('lista não vinculados do usuário', async () => {
      (prisma.estoque.findMany as jest.Mock).mockResolvedValue([{ id: 3, nome: 'Livre' }]);
      const reply = mockReply();
      const req = mockRequest({ user: { id: 10 } } as any);

      await listarEstoquesDisponiveis(req as any, reply);
      expect(prisma.estoque.findMany).toHaveBeenCalledWith({
        where: { usuarios: { none: { usuarioId: 10 } } },
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
      });
      expect(reply.send).toHaveBeenCalledWith([{ id: 3, nome: 'Livre' }]);
    });
  });

  describe('solicitarAcessoAoEstoque', () => {
    type RG = { Params: { id: string }; Body: { reason?: string } };

    it('401 sem user', async () => {
      const reply = mockReply();
      const req = mockRequest<RG>({ user: undefined as any, params: { id: '5' }, body: {} });

      await solicitarAcessoAoEstoque(req, reply);
      expect(reply.code).toHaveBeenCalledWith(401);
    });

    it('409 se já vinculado', async () => {
      (prisma.estoque.findUnique as jest.Mock).mockResolvedValue({ id: 5, nome: 'Main' });
      (prisma.usuarioEstoque.findUnique as jest.Mock).mockResolvedValue({ usuarioId: 77, estoqueId: 5 });

      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 77 } } as any, { params: { id: '5' }, body: {} } as any);
      (req as any).params = { id: '5' };
      (req as any).body = {};

      await solicitarAcessoAoEstoque(req as any, reply);
      expect(reply.code).toHaveBeenCalledWith(409);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Já vinculado' });
    });

    it('cria solicitação e notifica admins', async () => {
      (prisma.estoque.findUnique as jest.Mock).mockResolvedValue({ id: 5, nome: 'Main' });
      (prisma.usuarioEstoque.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.stockAccessRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.stockAccessRequest.create as jest.Mock).mockResolvedValue({ id: 99 });
      (prisma.usuario.findMany as jest.Mock).mockResolvedValue([{ id: 1 }]); // super-admins
      (prisma.usuarioEstoque.findMany as jest.Mock).mockResolvedValue([{ usuarioId: 2 }]); // stock admins
      (prisma.notificacao.createMany as jest.Mock).mockResolvedValue({});

      const reply = mockReply();
      const req = mockRequest<RG>({ user: { id: 77 } } as any, { params: { id: '5' }, body: { reason: 'pls' } } as any);
      (req as any).params = { id: '5' };

      await solicitarAcessoAoEstoque(req as any, reply);
      expect(reply.send).toHaveBeenCalledWith({ ok: true, solicitacaoId: 99 });
    });
  });

  describe('getSugerirFEFO', () => {
    type RG = { Querystring: { itemId: string; estoqueId: string; take?: string } };

    it('converte params e retorna', async () => {
      (sugerirFEFO as jest.Mock).mockResolvedValue([{ loteId: 1 }]);

      const reply = mockReply();
      const req = mockRequest<RG>({ query: { itemId: '7', estoqueId: '9', take: '15' } as any });

      await getSugerirFEFO(req, reply);
      expect(sugerirFEFO).toHaveBeenCalledWith(7, 9, 15);
      expect(reply.send).toHaveBeenCalledWith([{ loteId: 1 }]);
    });

    it('erro 400 quando serviço lança', async () => {
      (sugerirFEFO as jest.Mock).mockRejectedValue(new Error('bad'));
      const reply = mockReply();
      const req = mockRequest<RG>({ query: { itemId: '1', estoqueId: '1' } as any });

      await getSugerirFEFO(req, reply);
      expect(reply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('postPickingFEFO', () => {
    type RG = { Body: { estoqueId: number; itemId: number; quantidadeSolicitada: number; referencia?: any } };

    it('ok', async () => {
      (pickingFEFO as jest.Mock).mockResolvedValue({ ok: true });
      const reply = mockReply();
      const req = mockRequest<RG>({ body: { estoqueId: 1, itemId: 2, quantidadeSolicitada: 3 } });

      await postPickingFEFO(req, reply);
      expect(pickingFEFO).toHaveBeenCalledWith({ estoqueId: 1, itemId: 2, quantidadeSolicitada: 3, referencia: undefined });
      expect(reply.send).toHaveBeenCalledWith({ ok: true });
    });

    it('erro 400', async () => {
      (pickingFEFO as jest.Mock).mockRejectedValue(new Error('nope'));
      const reply = mockReply();
      const req = mockRequest<RG>({ body: { estoqueId: 1, itemId: 2, quantidadeSolicitada: 3 } });

      await postPickingFEFO(req, reply);
      expect(reply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('postSaidaSerial', () => {
    type RG = { Body: { estoqueId: number; itemId: number; serialNumero: string; referencia?: any } };

    it('ok', async () => {
      (saidaPorSerial as jest.Mock).mockResolvedValue({ ok: true });
      const reply = mockReply();
      const req = mockRequest<RG>({ body: { estoqueId: 1, itemId: 2, serialNumero: 'S123' } });

      await postSaidaSerial(req, reply);
      expect(saidaPorSerial).toHaveBeenCalledWith({ estoqueId: 1, itemId: 2, serialNumero: 'S123', referencia: undefined });
      expect(reply.send).toHaveBeenCalledWith({ ok: true });
    });

    it('erro 400', async () => {
      (saidaPorSerial as jest.Mock).mockRejectedValue(new Error('x'));
      const reply = mockReply();
      const req = mockRequest<RG>({ body: { estoqueId: 1, itemId: 2, serialNumero: 'S1' } });

      await postSaidaSerial(req, reply);
      expect(reply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('getEstoqueItemConfig', () => {
    type RG = { Params: { estoqueId: string; itemId: string } };

    it('retorna defaults quando não há registro', async () => {
      (prisma.estoqueItem.findUnique as jest.Mock).mockResolvedValue(null);
      const reply = mockReply();
      const req = mockRequest<RG>({ params: { estoqueId: '10', itemId: '5' } });

      await getEstoqueItemConfig(req, reply);
      expect(reply.send).toHaveBeenCalledWith({
        itemId: 5,
        estoqueId: 10,
        quantidade: 0,
        minimo: 0,
        autoAtivo: false,
        maximo: null,
        multiplo: null,
        origemPreferidaId: null,
        leadTimeDias: null,
      });
    });

    it('retorna o registro quando existe', async () => {
      (prisma.estoqueItem.findUnique as jest.Mock).mockResolvedValue({
        itemId: 5,
        estoqueId: 10,
        quantidade: 1,
        minimo: 2,
        autoAtivo: true,
        maximo: 10,
        multiplo: 2,
        origemPreferidaId: 3,
        leadTimeDias: 4,
      });
      const reply = mockReply();
      const req = mockRequest<RG>({ params: { estoqueId: '10', itemId: '5' } });

      await getEstoqueItemConfig(req, reply);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ itemId: 5, estoqueId: 10, autoAtivo: true })
      );
    });
  });

  describe('patchEstoqueItemAutoConfig', () => {
    type RG = {
      Params: { estoqueId: string; itemId: string };
      Body: Partial<{
        autoAtivo: boolean;
        maximo: number | null;
        multiplo: number | null;
        origemPreferidaId: number | null | 0;
        leadTimeDias: number | null;
      }>;
    };

    it('400 se multiplo < 1', async () => {
      const reply = mockReply();
      const req = mockRequest<RG>({
        params: { estoqueId: '10', itemId: '5' },
        body: { multiplo: 0 },
      });

      await patchEstoqueItemAutoConfig(req, reply);
      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'multiplo deve ser >= 1' });
    });

    it('faz upsert quando body presente e chama checagem', async () => {
      (prisma.estoqueItem.upsert as jest.Mock).mockResolvedValue({
        itemId: 5, estoqueId: 10, autoAtivo: true, maximo: 10, multiplo: 2,
        origemPreferidaId: null, leadTimeDias: null, quantidade: 0, minimo: 0,
      });
      (checarLimitesEGerenciarAlertas as jest.Mock).mockResolvedValue({ created: true, agendamentoId: 1 });

      const reply = mockReply();
      const req = mockRequest<RG>({
        params: { estoqueId: '10', itemId: '5' },
        body: { autoAtivo: true, maximo: 10, multiplo: 2, origemPreferidaId: 0 },
      });

      await patchEstoqueItemAutoConfig(req, reply);

      expect(prisma.estoqueItem.upsert).toHaveBeenCalled();
      expect(checarLimitesEGerenciarAlertas).toHaveBeenCalledWith(10, 5);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ ok: true, updated: expect.any(Object), result: expect.any(Object) })
      );
    });

    it('sem body: não faz upsert, apenas roda checagem', async () => {
      (checarLimitesEGerenciarAlertas as jest.Mock).mockResolvedValue({ reason: 'noop' });

      const reply = mockReply();
      const req = mockRequest<RG>({ params: { estoqueId: '10', itemId: '5' }, body: {} });

      await patchEstoqueItemAutoConfig(req, reply);
      expect(prisma.estoqueItem.upsert).not.toHaveBeenCalled();
      expect(checarLimitesEGerenciarAlertas).toHaveBeenCalled();
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ ok: true, result: expect.any(Object) })
      );
    });
  });
});
