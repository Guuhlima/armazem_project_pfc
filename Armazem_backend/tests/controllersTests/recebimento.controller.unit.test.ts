import type {
  FastifyReply,
  FastifyRequest,
  RouteGenericInterface,
} from 'fastify';

import { receberEquipamento } from '../../src/controllers/recebimento.controller';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    equipamento: { findUnique: jest.fn() },
    lote: { findFirst: jest.fn() },
    serial: { findUnique: jest.fn() },
  },
}));
jest.mock('../../src/service/estoque.service', () => ({
  receber: jest.fn(),
  saldoPorLote: jest.fn(),
}));
jest.mock('../../src/service/estoque-alertas.service', () => ({
  checarLimitesEGerenciarAlertas: jest.fn(),
}));

import { prisma } from '../../src/lib/prisma';
import * as inv from '../../src/service/estoque.service';
import { checarLimitesEGerenciarAlertas } from '../../src/service/estoque-alertas.service';

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
    log: { info: jest.fn(), error: jest.fn() } as any,
  };
  Object.assign(req as any, ...overrides);
  return req as FastifyRequest<RG>;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('receberEquipamento', () => {
  type RG = {
    Body: {
      estoqueId: number;
      itemId: number;
      quantidade: number;
      loteCodigo?: string;
      validade?: string | Date | null;
      serialNumero?: string;
      referencia?: { tabela?: string; id?: number };
    };
  };

  it('400 quando quantidade <= 0', async () => {
    const reply = mockReply();
    const req = mockRequest<RG>({
      body: { estoqueId: 1, itemId: 2, quantidade: 0 },
    });

    await receberEquipamento(req as any, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Quantidade deve ser maior que zero' });
  });

  it('404 quando item não existe', async () => {
    (prisma.equipamento.findUnique as jest.Mock).mockResolvedValue(null);

    const reply = mockReply();
    const req = mockRequest<RG>({
      body: { estoqueId: 1, itemId: 99, quantidade: 1 },
    });

    await receberEquipamento(req as any, reply);

    expect(prisma.equipamento.findUnique).toHaveBeenCalledWith({
      where: { id: 99 },
      select: { rastreioTipo: true, nome: true },
    });
    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Item 99 não encontrado' });
  });

  it('400 quando item é SERIAL e quantidade !== 1', async () => {
    (prisma.equipamento.findUnique as jest.Mock).mockResolvedValue({ rastreioTipo: 'SERIAL', nome: 'A' });

    const reply = mockReply();
    const req = mockRequest<RG>({
      body: { estoqueId: 1, itemId: 3, quantidade: 2 }, // inválido p/ SERIAL
    });

    await receberEquipamento(req as any, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error: 'Itens SERIAL devem ser recebidos com quantidade = 1',
    });
  });

  it('sucesso (PADRAO) sem lote/serial, checagem/saldo ok', async () => {
    (prisma.equipamento.findUnique as jest.Mock).mockResolvedValue({ rastreioTipo: 'PADRAO', nome: 'X' });
    (inv.receber as jest.Mock).mockResolvedValue(undefined);
    (checarLimitesEGerenciarAlertas as jest.Mock).mockResolvedValue(undefined);
    (inv.saldoPorLote as jest.Mock).mockResolvedValue([{ codigo: 'L1', saldo: 5 }]);

    const reply = mockReply();
    const req = mockRequest<RG>({
      body: { estoqueId: 10, itemId: 20, quantidade: 3 },
    });

    await receberEquipamento(req as any, reply);

    expect(inv.receber).toHaveBeenCalledWith({
      estoqueId: 10,
      itemId: 20,
      quantidade: 3,
      loteCodigo: undefined,
      validade: undefined,
      serialNumero: undefined,
      referencia: { tabela: 'recebimento', id: undefined },
    });

    expect(checarLimitesEGerenciarAlertas).toHaveBeenCalledWith(10, 20);
    expect(inv.saldoPorLote).toHaveBeenCalledWith(20, 10);

    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        message: 'Recebimento lançado com sucesso',
        estoqueId: 10,
        itemId: 20,
        quantidade: 3,
        itemRastreio: 'PADRAO',
        lote: null,
        serial: null,
        saldoPorLote: [{ codigo: 'L1', saldo: 5 }],
      })
    );
  });

  it('sucesso com loteCodigo => retorna dados do lote', async () => {
    (prisma.equipamento.findUnique as jest.Mock).mockResolvedValue({ rastreioTipo: 'LOTE', nome: 'Y' });
    (inv.receber as jest.Mock).mockResolvedValue(undefined);
    (checarLimitesEGerenciarAlertas as jest.Mock).mockResolvedValue(undefined);
    (inv.saldoPorLote as jest.Mock).mockResolvedValue([]);
    (prisma.lote.findFirst as jest.Mock).mockResolvedValue({
      id: 7, codigo: 'ABC', validade: new Date('2030-01-01'),
    });

    const reply = mockReply();
    const req = mockRequest<RG>({
      body: { estoqueId: 1, itemId: 2, quantidade: 5, loteCodigo: 'ABC' },
    });

    await receberEquipamento(req as any, reply);

    expect(prisma.lote.findFirst).toHaveBeenCalledWith({
      where: { itemId: 2, codigo: 'ABC' },
      select: { id: true, codigo: true, validade: true },
    });
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        lote: { id: 7, codigo: 'ABC', validade: new Date('2030-01-01') },
      })
    );
  });

  it('sucesso com serialNumero => retorna dados do serial', async () => {
    (prisma.equipamento.findUnique as jest.Mock).mockResolvedValue({ rastreioTipo: 'SERIAL', nome: 'Z' });
    (inv.receber as jest.Mock).mockResolvedValue(undefined);
    (checarLimitesEGerenciarAlertas as jest.Mock).mockResolvedValue(undefined);
    (inv.saldoPorLote as jest.Mock).mockResolvedValue([]);
    (prisma.serial.findUnique as jest.Mock).mockResolvedValue({
      id: 99, numero: 'SN-1', loteId: 123,
    });

    const reply = mockReply();
    const req = mockRequest<RG>({
      body: { estoqueId: 1, itemId: 2, quantidade: 1, serialNumero: 'SN-1' },
    });

    await receberEquipamento(req as any, reply);

    expect(prisma.serial.findUnique).toHaveBeenCalledWith({
      where: { numero: 'SN-1' },
      select: { id: true, numero: true, loteId: true },
    });
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        serial: { id: 99, numero: 'SN-1', loteId: 123 },
      })
    );
  });

  it('quando checarLimites falha, continua ok e saldoPorLote cai para [] (catch)', async () => {
    (prisma.equipamento.findUnique as jest.Mock).mockResolvedValue({ rastreioTipo: 'PADRAO', nome: 'X' });
    (inv.receber as jest.Mock).mockResolvedValue(undefined);
    (checarLimitesEGerenciarAlertas as jest.Mock).mockRejectedValue(new Error('tg down'));
    (inv.saldoPorLote as jest.Mock).mockRejectedValue(new Error('calc down'));

    const reply = mockReply();
    const req = mockRequest<RG>({ body: { estoqueId: 9, itemId: 8, quantidade: 2 } });

    await receberEquipamento(req as any, reply);

    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        saldoPorLote: [], // devido ao catch interno
      })
    );
  });

  it('mapeia mensagens conhecidas para 400 (erro de negócio vindo do serviço)', async () => {
    (prisma.equipamento.findUnique as jest.Mock).mockResolvedValue({ rastreioTipo: 'PADRAO', nome: 'X' });
    (inv.receber as jest.Mock).mockRejectedValue(new Error('campo obrigatório: loteCodigo'));
    const reply = mockReply();
    const req = mockRequest<RG>({ body: { estoqueId: 1, itemId: 2, quantidade: 1 } });

    await receberEquipamento(req as any, reply);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: 'campo obrigatório: loteCodigo' });
  });

  it('erro inesperado => 500', async () => {
    (prisma.equipamento.findUnique as jest.Mock).mockImplementation(() => { throw new Error('db exploded'); });

    const reply = mockReply();
    const req = mockRequest<RG>({ body: { estoqueId: 1, itemId: 2, quantidade: 1 } });

    await receberEquipamento(req as any as any, reply);
    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Erro ao lançar recebimento' });
  });
});
