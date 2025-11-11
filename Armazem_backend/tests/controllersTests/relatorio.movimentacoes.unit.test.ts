import type {
  FastifyReply,
  FastifyRequest,
  RouteGenericInterface,
} from 'fastify';

import { relatorioMovimentacoesController } from '../../src/controllers/movimentacoes.controller';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    transferencia: { findMany: jest.fn() },
    transferenciaAgendada: { findMany: jest.fn() },
    equipamento: { findMany: jest.fn() },
    estoque: { findMany: jest.fn() },
  },
}));

jest.mock('../../src/utils/utils', () => ({
  parseDateLoose: jest.fn(),
  truncBucket: jest.fn(),
}));

import { prisma } from '../../src/lib/prisma';
import { parseDateLoose, truncBucket } from '../../src/utils/utils';

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

  (parseDateLoose as jest.Mock).mockImplementation((s?: string) => {
    if (!s) return undefined;
    const d = new Date(s as any);
    return isNaN(d.getTime()) ? d : d;
  });

  (truncBucket as jest.Mock).mockImplementation((ts: Date, granularity: string) => {
    if (granularity === 'day') return ts.toISOString().slice(0, 10);
    return ts.toISOString();
  });
});

describe('relatorioMovimentacoesController', () => {
  type RG = {
    Querystring: {
      itemId?: string;
      estoqueId?: string;
      inicio?: string;
      fim?: string;
      granularity?: 'day' | 'hour' | 'week' | 'month';
    };
  };

  it('400 quando datas inválidas', async () => {
    const reply = mockReply();
    (parseDateLoose as jest.Mock).mockImplementation((s?: string) => {
      if (s === 'abc') return new Date('abc');
      return new Date('2025-01-10');
    });

    const req = mockRequest<RG>({
      query: { inicio: 'abc', fim: '2025-01-10', granularity: 'day' },
    });

    await relatorioMovimentacoesController(req as any, reply);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error: 'inicio/fim inválidos. Use ISO 8601 ou YYYY-MM-DD.',
    });
  });

  it('400 quando fim <= inicio', async () => {
    const reply = mockReply();
    (parseDateLoose as jest.Mock).mockImplementation((s?: string) => new Date(s!));

    const req = mockRequest<RG>({
      query: { inicio: '2025-01-10', fim: '2025-01-10', granularity: 'day' },
    });

    await relatorioMovimentacoesController(req as any, reply);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error: 'fim deve ser maior que inicio.',
    });
  });

  it('caminho feliz: agrega reais e agendadas por bucket (day)', async () => {
    const reply = mockReply();
    (parseDateLoose as jest.Mock).mockImplementation((s?: string) => new Date(s!));

    const D1 = new Date('2025-01-05T12:00:00Z');
    const D2 = new Date('2025-01-06T12:00:00Z');

    (prisma.transferencia.findMany as jest.Mock).mockResolvedValue([
      { itemId: 1, estoqueOrigemId: 10, estoqueDestinoId: 20, quantidade: 3, dataTransferencia: D1 },
      { itemId: 1, estoqueOrigemId: 20, estoqueDestinoId: 10, quantidade: 2, dataTransferencia: D2 },
    ]);

    (prisma.transferenciaAgendada.findMany as jest.Mock).mockResolvedValue([
      { itemId: 1, estoqueOrigemId: 10, estoqueDestinoId: 30, quantidade: 4, executarEm: D1, status: 'PENDING' },
    ]);

    (prisma.equipamento.findMany as jest.Mock).mockResolvedValue([{ id: 1, nome: 'Item A' }]);
    (prisma.estoque.findMany as jest.Mock).mockResolvedValue([
      { id: 10, nome: 'E10' },
      { id: 20, nome: 'E20' },
      { id: 30, nome: 'E30' },
    ]);

    const req = mockRequest<RG>({
      query: {
        inicio: '2025-01-01',
        fim: '2025-01-10',
        granularity: 'day',
      },
    });

    await relatorioMovimentacoesController(req as any, reply);

    expect(prisma.transferencia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dataTransferencia: { gte: new Date('2025-01-01'), lte: new Date('2025-01-10') },
        }),
      })
    );

    const sent = (reply.send as jest.Mock).mock.calls[0][0];
    expect(sent.periodo).toEqual({
      inicio: new Date('2025-01-01').toISOString(),
      fim: new Date('2025-01-10').toISOString(),
      granularity: 'day',
    });

    const linhas = sent.linhas as any[];
    const key = (i: any) => `${i.itemId}|${i.estoqueId}|${i.bucket}`;

    const m = new Map(linhas.map((i) => [key(i), i]));
    expect(m.get('1|10|2025-01-05')).toMatchObject({
      entradas: 0,
      saidas: 7, // 3 + 4
      tipos: expect.arrayContaining(['TRANSFER_OUT', 'SCHEDULED_OUT']),
      itemNome: 'Item A',
      estoqueNome: 'E10',
    });

    expect(m.get('1|20|2025-01-05')).toMatchObject({
      entradas: 3,
      saidas: 0,
      tipos: expect.arrayContaining(['TRANSFER_IN']),
      estoqueNome: 'E20',
    });

    expect(m.get('1|30|2025-01-05')).toMatchObject({
      entradas: 4,
      saidas: 0,
      tipos: expect.arrayContaining(['SCHEDULED_IN']),
      estoqueNome: 'E30',
    });

    expect(m.get('1|20|2025-01-06')).toMatchObject({
      entradas: 0,
      saidas: 2,
      tipos: expect.arrayContaining(['TRANSFER_OUT']),
    });

    expect(m.get('1|10|2025-01-06')).toMatchObject({
      entradas: 2,
      saidas: 0,
      tipos: expect.arrayContaining(['TRANSFER_IN']),
    });
  });

  it('aplica filtro por estoqueId (somente orig/dest iguais ao filtro)', async () => {
    const reply = mockReply();
    (parseDateLoose as jest.Mock).mockImplementation((s?: string) => new Date(s!));

    const D = new Date('2025-02-01T00:00:00Z');

    (prisma.transferencia.findMany as jest.Mock).mockResolvedValue([
      { itemId: 1, estoqueOrigemId: 10, estoqueDestinoId: 20, quantidade: 5, dataTransferencia: D },
    ]);
    (prisma.transferenciaAgendada.findMany as jest.Mock).mockResolvedValue([
      { itemId: 1, estoqueOrigemId: 10, estoqueDestinoId: 30, quantidade: 2, executarEm: D, status: 'PENDING' },
    ]);
    (prisma.equipamento.findMany as jest.Mock).mockResolvedValue([{ id: 1, nome: 'Item A' }]);
    (prisma.estoque.findMany as jest.Mock).mockResolvedValue([
      { id: 10, nome: 'E10' },
      { id: 20, nome: 'E20' },
      { id: 30, nome: 'E30' },
    ]);

    const req = mockRequest<RG>({
      query: { inicio: '2025-01-31', fim: '2025-02-02', granularity: 'day', estoqueId: '10' },
    });

    await relatorioMovimentacoesController(req as any, reply);

    const sent = (reply.send as jest.Mock).mock.calls[0][0];
    const linhas = sent.linhas as any[];
    expect(linhas.length).toBe(1);
    expect(linhas[0]).toMatchObject({
      itemId: 1,
      estoqueId: 10,
      entradas: 0,
      saidas: 7,
      tipos: expect.arrayContaining(['TRANSFER_OUT', 'SCHEDULED_OUT']),
      bucket: '2025-02-01',
    });
  });

  it('retorna lista vazia quando não há movimentos', async () => {
    const reply = mockReply();
    (parseDateLoose as jest.Mock).mockImplementation((s?: string) => new Date(s!));
    (prisma.transferencia.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.transferenciaAgendada.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.equipamento.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.estoque.findMany as jest.Mock).mockResolvedValue([]);

    const req = mockRequest<RG>({
      query: { inicio: '2025-01-01', fim: '2025-01-02', granularity: 'day' },
    });

    await relatorioMovimentacoesController(req as any, reply);

    const sent = (reply.send as jest.Mock).mock.calls[0][0];
    expect(sent.linhas).toEqual([]);
  });

  it('500 em erro inesperado', async () => {
    const reply = mockReply();
    (parseDateLoose as jest.Mock).mockImplementation((s?: string) => new Date(s!));
    (prisma.transferencia.findMany as jest.Mock).mockRejectedValue(new Error('db down'));

    const req = mockRequest<RG>({
      query: { inicio: '2025-01-01', fim: '2025-01-02', granularity: 'day' },
    });

    await relatorioMovimentacoesController(req as any, reply);
    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Erro ao gerar relatório de movimentações' });
  });
});
