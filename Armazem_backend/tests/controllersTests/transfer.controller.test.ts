import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../src/lib/prisma';
import {
  realizarTransferencia,
  visualizarTransferencias,
  visualizarTransferenciaPorId,
  deletarTransferencia,
} from '../../src/controllers/transfer.controller';

import { TelegramService } from '../../src/service/telegram.service';
import * as alertas from '../../src/service/estoque-alertas.service';
import * as inv from '../../src/service/estoque.service';

const createReply = () =>
  ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as FastifyReply);

const user = { id: 42, nome: 'Tester' };

describe('Transferência Controller (integração, sem mock de Prisma)', () => {
  beforeAll(() => {
    // evita rede/side effects
    jest.spyOn(TelegramService, 'sendTransferNotification').mockResolvedValue(undefined as any);
    jest.spyOn(alertas, 'checarLimitesEGerenciarAlertas').mockResolvedValue(undefined as any);
    jest.spyOn(inv, 'transferir').mockResolvedValue(undefined as any);
  });

  beforeEach(async () => {
    // zera o schema
    const schema = (process.env.DATABASE_URL!.split('schema=')[1] || '').replace(/&.*/, '');
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = ${schema};
    `;
    for (const t of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${schema}"."${t.tablename}" RESTART IDENTITY CASCADE`);
    }

    // seeds mínimos
    await prisma.estoque.createMany({
      data: [{ id: 1001, nome: 'Origem' }, { id: 1002, nome: 'Destino' }],
    });
    await prisma.equipamento.create({ data: { id: 5001, nome: 'Notebook QA' } });

    // FK: transferencia.usuarioId -> usuario.id
    await prisma.usuario.create({
      data: {
        id: 42,
        nome: 'Tester',
        email: 'tester@qa.local',
        senha: 'hashfake',
      },
    });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma.$disconnect();
  });

  it('realizarTransferencia -> cria registro e notifica (feliz)', async () => {
    const reply = createReply();

    const req = {
      user,
      body: {
        itemId: 5001,
        estoqueOrigemId: 1001,
        estoqueDestinoId: 1002,
        quantidade: 3,
      },
    } as unknown as FastifyRequest;

    await realizarTransferencia(req as any, reply);

    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        message: expect.stringMatching(/Transferência realizada/),
        transferenciaId: expect.any(Number),
        itemNome: 'Notebook QA',
      })
    );

    const body = (reply.send as jest.Mock).mock.calls[0][0];
    const db = await prisma.transferencia.findUnique({ where: { id: body.transferenciaId } });
    expect(db).toMatchObject({
      id: body.transferenciaId,
      itemId: 5001,
      estoqueOrigemId: 1001,
      estoqueDestinoId: 1002,
      quantidade: 3,
      usuarioId: 42,
    });

    expect(TelegramService.sendTransferNotification).toHaveBeenCalled();
    expect(alertas.checarLimitesEGerenciarAlertas).toHaveBeenCalledTimes(2);
    expect(inv.transferir).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 5001,
        quantidade: 3,
        origemId: 1001,
        destinoId: 1002,
      })
    );
  });

  it('valida: estoques iguais → 400', async () => {
    const reply = createReply();
    await realizarTransferencia(
      { user, body: { itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1001, quantidade: 1 } } as any,
      reply
    );
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/origem e destino/i) })
    );
  });

  it('valida: quantidade <= 0 → 400', async () => {
    const reply = createReply();
    await realizarTransferencia(
      { user, body: { itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: 0 } } as any,
      reply
    );
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it('valida: sem autenticação → 401', async () => {
    const reply = createReply();
    await realizarTransferencia(
      { body: { itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: 1 } } as any,
      reply
    );
    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Não autenticado' });
  });

  it('valida: lote informado inexistente → 400', async () => {
    const reply = createReply();
    await realizarTransferencia(
      {
        user,
        body: { itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: 1, loteCodigo: 'L-404' },
      } as any,
      reply
    );
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/Lote .* não encontrado/i) })
    );
  });

  it('valida: serial informado não pertence ao item → 400', async () => {
    await prisma.equipamento.create({ data: { id: 5002, nome: 'Outro' } });
    await prisma.serial.create({ data: { numero: 'S-XYZ', itemId: 5002 } });

    const reply = createReply();
    await realizarTransferencia(
      {
        user,
        body: {
          itemId: 5001,
          estoqueOrigemId: 1001,
          estoqueDestinoId: 1002,
          quantidade: 1,
          serialNumero: 'S-XYZ',
        },
      } as any,
      reply
    );
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/Serial .* não encontrado .* item/i) })
    );
  });

  it('lote e serial válidos → sucesso', async () => {
    await prisma.lote.create({ data: { id: 7001, itemId: 5001, codigo: 'LOTE-OK' } });
    await prisma.serial.create({ data: { numero: 'SERIAL-OK', itemId: 5001 } });

    const reply = createReply();
    await realizarTransferencia(
      {
        user,
        body: {
          itemId: 5001,
          estoqueOrigemId: 1001,
          estoqueDestinoId: 1002,
          quantidade: 2,
          loteCodigo: 'LOTE-OK',
          serialNumero: 'SERIAL-OK',
          referencia: { tabela: 'ordem_servico', id: 123 },
        },
      } as any,
      reply
    );

    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        transferenciaId: expect.any(Number),
        itemNome: 'Notebook QA',
      })
    );
    expect(inv.transferir).toHaveBeenCalledWith(
      expect.objectContaining({
        loteId: 7001,
        serialId: expect.any(Number),
        referencia: expect.objectContaining({ tabela: 'ordem_servico', id: 123 }),
      })
    );
  });

  it('visualizarTransferencias -> lista tudo', async () => {
    for (const q of [1, 2]) {
      const reply = createReply();
      await realizarTransferencia(
        { user, body: { itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: q } } as any,
        reply
      );
    }

    const replyList = createReply();
    await visualizarTransferencias({} as any, replyList);

    const payload = (replyList.send as jest.Mock).mock.calls[0][0];
    expect(Array.isArray(payload)).toBe(true);
    expect(payload.length).toBe(2);
    expect(payload.map((t: any) => t.quantidade).sort()).toEqual([1, 2]);
  });

  it('visualizarTransferenciaPorId -> 404 quando não encontra', async () => {
    const reply = createReply();
    await visualizarTransferenciaPorId({ params: { id: '9999' } } as any, reply);
    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Transferência não encontrada' });
  });

  it('visualizarTransferenciaPorId -> retorna quando existe', async () => {
    const replyDoCreate = createReply();
    await realizarTransferencia(
      { user, body: { itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: 7 } } as any,
      replyDoCreate
    );
    const createdId = (replyDoCreate.send as jest.Mock).mock.calls[0][0].transferenciaId;

    const reply = createReply();
    await visualizarTransferenciaPorId({ params: { id: String(createdId) } } as any, reply);

    const payload = (reply.send as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({
      id: createdId,
      itemId: 5001,
      estoqueOrigemId: 1001,
      estoqueDestinoId: 1002,
      quantidade: 7,
      usuarioId: 42,
    });
  });

  it('deletarTransferencia -> deleta e confirma remoção', async () => {
    const replyCreate = createReply();
    await realizarTransferencia(
      { user, body: { itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: 4 } } as any,
      replyCreate
    );
    const createdId = (replyCreate.send as jest.Mock).mock.calls[0][0].transferenciaId;

    const reply = createReply();
    await deletarTransferencia({ params: { id: String(createdId) } } as any, reply);

    expect(reply.send).toHaveBeenCalledWith('Transferência deletada com sucesso');
    const after = await prisma.transferencia.findUnique({ where: { id: createdId } });
    expect(after).toBeNull();
  });
});
