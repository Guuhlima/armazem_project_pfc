import type {
  FastifyReply,
  FastifyRequest,
  RouteGenericInterface,
} from 'fastify';

import {
  listarTarefasHandler,
  gerarHandler,
  iniciarHandler,
  lancarHandler,
  cancelarHandler,
} from '../../src/controllers/contagem.controller';

jest.mock('../../src/service/contagem-ciclica.service', () => ({
  gerarTarefasVencidas: jest.fn(),
  listarTarefas: jest.fn(),
  iniciarTarefa: jest.fn(),
  lancarContagem: jest.fn(),
  cancelarTarefa: jest.fn(),
}));

import {
  gerarTarefasVencidas,
  listarTarefas,
  iniciarTarefa,
  lancarContagem,
  cancelarTarefa,
} from '../../src/service/contagem-ciclica.service';

function mockReply() {
  const reply: Partial<FastifyReply> = {
    status: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    internalServerError: jest.fn().mockReturnThis(),
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

describe('contagem-ciclica.controller', () => {
  describe('listarTarefasHandler', () => {
    type RG = { Querystring: { status?: string } };

    it('retorna lista de tarefas', async () => {
      (listarTarefas as jest.Mock).mockResolvedValue([{ id: 1 }]);
      const reply = mockReply();
      const req = mockRequest<RG>({ query: { status: 'PENDING' } });

      await listarTarefasHandler(req, reply);

      expect(listarTarefas).toHaveBeenCalledWith({ status: 'PENDING' });
      expect(reply.send).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('500 interno via internalServerError', async () => {
      (listarTarefas as jest.Mock).mockRejectedValue(new Error('db'));
      const reply = mockReply();
      const req = mockRequest<RG>({ query: {} });

      await listarTarefasHandler(req, reply);

      expect(reply.internalServerError).toHaveBeenCalledWith('Falha ao listar tarefas');
    });
  });

  describe('gerarHandler', () => {
    it('gera tarefas vencidas', async () => {
      (gerarTarefasVencidas as jest.Mock).mockResolvedValue({ created: 3 });
      const reply = mockReply();
      const req = mockRequest();

      await gerarHandler(req as any, reply);

      expect(gerarTarefasVencidas).toHaveBeenCalled();
      expect(reply.send).toHaveBeenCalledWith({ created: 3 });
    });

    it('500 interno via internalServerError', async () => {
      (gerarTarefasVencidas as jest.Mock).mockRejectedValue(new Error('x'));
      const reply = mockReply();
      const req = mockRequest();

      await gerarHandler(req as any, reply);

      expect(reply.internalServerError).toHaveBeenCalledWith('Falha ao gerar tarefas de contagem');
    });
  });

  describe('iniciarHandler', () => {
    type RG = { Params: { id: number }; Body: { userId: number } };

    it('retorna 400 quando iniciarTarefa.ok = false', async () => {
      (iniciarTarefa as jest.Mock).mockResolvedValue({ ok: false, error: 'msg' });

      const reply = mockReply();
      const req = mockRequest<RG>({ params: { id: 10 } as any, body: { userId: 7 } });

      await iniciarHandler(req, reply);

      expect(iniciarTarefa).toHaveBeenCalledWith(10, 7);
      expect(reply.code).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ ok: false, error: 'msg' });
    });

    it('sucesso quando ok = true', async () => {
      (iniciarTarefa as jest.Mock).mockResolvedValue({ ok: true, taskId: 99 });

      const reply = mockReply();
      const req = mockRequest<RG>({ params: { id: 10 } as any, body: { userId: 7 } });

      await iniciarHandler(req, reply);

      expect(reply.send).toHaveBeenCalledWith({ ok: true, taskId: 99 });
    });

    it('500 interno via internalServerError', async () => {
      (iniciarTarefa as jest.Mock).mockRejectedValue(new Error('boom'));

      const reply = mockReply();
      const req = mockRequest<RG>({ params: { id: 1 } as any, body: { userId: 2 } });

      await iniciarHandler(req, reply);

      expect(reply.internalServerError).toHaveBeenCalledWith('Falha ao iniciar tarefa de contagem');
    });
  });

  describe('lancarHandler', () => {
    type RG = { Params: { id: number }; Body: { userId: number; quantidade: number } };

    it('400 quando lancarContagem.ok = false', async () => {
      (lancarContagem as jest.Mock).mockResolvedValue({ ok: false, error: 'inválido' });

      const reply = mockReply();
      const req = mockRequest<RG>({
        params: { id: 5 } as any,
        body: { userId: 7, quantidade: 3 },
      });

      await lancarHandler(req, reply);

      expect(lancarContagem).toHaveBeenCalledWith(5, 7, 3);
      expect(reply.code).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ ok: false, error: 'inválido' });
    });

    it('sucesso quando ok = true', async () => {
      (lancarContagem as jest.Mock).mockResolvedValue({ ok: true, diff: 0 });

      const reply = mockReply();
      const req = mockRequest<RG>({
        params: { id: 5 } as any,
        body: { userId: 7, quantidade: 3 },
      });

      await lancarHandler(req, reply);

      expect(reply.send).toHaveBeenCalledWith({ ok: true, diff: 0 });
    });

    it('500 interno via internalServerError', async () => {
      (lancarContagem as jest.Mock).mockRejectedValue(new Error('db'));

      const reply = mockReply();
      const req = mockRequest<RG>({
        params: { id: 5 } as any,
        body: { userId: 7, quantidade: 3 },
      });

      await lancarHandler(req, reply);

      expect(reply.internalServerError).toHaveBeenCalledWith('Falha ao lançar contagem');
    });
  });

  describe('cancelarHandler', () => {
    type RG = { Params: { id: number }; Body: { motivo?: string } };

    it('400 quando cancelarTarefa.ok = false', async () => {
      (cancelarTarefa as jest.Mock).mockResolvedValue({ ok: false, error: 'não permitido' });

      const reply = mockReply();
      const req = mockRequest<RG>({
        params: { id: 3 } as any,
        body: { motivo: 'erro' },
      });

      await cancelarHandler(req, reply);

      expect(cancelarTarefa).toHaveBeenCalledWith(3, 'erro');
      expect(reply.code).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ ok: false, error: 'não permitido' });
    });

    it('sucesso quando ok = true', async () => {
      (cancelarTarefa as jest.Mock).mockResolvedValue({ ok: true });

      const reply = mockReply();
      const req = mockRequest<RG>({
        params: { id: 3 } as any,
        body: { motivo: 'ajuste' },
      });

      await cancelarHandler(req, reply);

      expect(reply.send).toHaveBeenCalledWith({ ok: true });
    });

    it('500 interno via internalServerError', async () => {
      (cancelarTarefa as jest.Mock).mockRejectedValue(new Error('x'));

      const reply = mockReply();
      const req = mockRequest<RG>({
        params: { id: 3 } as any,
        body: {},
      });

      await cancelarHandler(req, reply);

      expect(reply.internalServerError).toHaveBeenCalledWith('Falha ao cancelar tarefa de contagem');
    });
  });
});
