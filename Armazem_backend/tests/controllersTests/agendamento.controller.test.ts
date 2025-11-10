import { FastifyReply, FastifyRequest } from 'fastify';
import { $Enums, Prisma } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';
import {
  createAgendamento,
  cancelAgendamento,
  listAgendamentos,
  getAgendamentoById,
  postExecutarAgendamento,
  postExecutarPendentes,
  getAutoPendentes,
  runAutoRepos,
} from '../../src/controllers/agendamento.controller';

import { TelegramService } from '../../src/service/telegram.service';
import * as agSrv from '../../src/service/agendamento.service';
import * as alertas from '../../src/service/estoque-alertas.service';

const createReply = () =>
  ({
    status: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as FastifyReply);

const user = { id: 42, nome: 'Tester' };

describe('Agendamento Controller (integração)', () => {
  beforeAll(() => {
    jest.spyOn(TelegramService, 'sendAgendamentoCreatedNotification').mockResolvedValue(undefined as any);
    jest.spyOn(TelegramService, 'sendAgendamentoCanceledNotification').mockResolvedValue(undefined as any);
    jest.spyOn(agSrv, 'executarAgendamento').mockResolvedValue({ ok: true } as any);
    jest.spyOn(agSrv, 'executarPendentes').mockResolvedValue({ ok: true, count: 0 } as any);
    jest.spyOn(alertas, 'checarLimitesEGerenciarAlertas').mockResolvedValue(undefined as any);
  });

  beforeEach(async () => {
    const schema = (process.env.DATABASE_URL!.split('schema=')[1] || '').replace(/&.*/, '');
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = ${schema};
    `;
    for (const t of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${schema}"."${t.tablename}" RESTART IDENTITY CASCADE`);
    }

    await prisma.estoque.createMany({
      data: [
        { id: 1001, nome: 'Origem' },
        { id: 1002, nome: 'Destino' },
        { id: 1003, nome: 'Outro Destino' },
      ],
    });
    await prisma.equipamento.createMany({
      data: [
        { id: 5001, nome: 'Notebook QA' },
        { id: 5002, nome: 'Outro Equipamento' },
      ],
    });
    await prisma.usuario.create({
      data: { id: 42, nome: 'Tester', email: 'tester@qa.local', senha: 'x' },
    });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma.$disconnect();
  });

  function futureIso(msFromNow = 60_000): string {
    return new Date(Date.now() + msFromNow).toISOString();
  }

  it('createAgendamento -> 201 + notifica (feliz)', async () => {
    const reply = createReply();
    await createAgendamento(
      {
        user,
        body: {
          itemId: 5001,
          estoqueOrigemId: 1001,
          estoqueDestinoId: 1002,
          quantidade: 3,
          executarEm: futureIso(),
        },
      } as any,
      reply
    );

    expect(reply.code).toHaveBeenCalledWith(201);
    const payload = (reply.send as jest.Mock).mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({
      id: expect.any(Number),
      itemId: 5001,
      estoqueOrigemId: 1001,
      estoqueDestinoId: 1002,
      quantidade: 3,
      status: 'PENDING',
    }));

    expect(TelegramService.sendAgendamentoCreatedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        agendamentoId: expect.any(Number),
        itemNome: 'Notebook QA',
        quantidade: 3,
        estoqueOrigemId: 1001,
        estoqueDestinoId: 1002,
        usuario: 'Tester',
      })
    );
  });

  it('createAgendamento -> 401 sem user', async () => {
    const reply = createReply();
    await createAgendamento(
      {
        body: {
          itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: 1, executarEm: futureIso(),
        },
      } as any,
      reply
    );
    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('createAgendamento -> 400 estoques iguais', async () => {
    const reply = createReply();
    await createAgendamento(
      { user, body: { itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1001, quantidade: 1, executarEm: futureIso() } } as any,
      reply
    );
    expect(reply.status).toHaveBeenCalledWith(400);
  });

  it('createAgendamento -> 400 quantidade <= 0', async () => {
    const reply = createReply();
    await createAgendamento(
      { user, body: { itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: 0, executarEm: futureIso() } } as any,
      reply
    );
    expect(reply.status).toHaveBeenCalledWith(400);
  });

  it('createAgendamento -> 400 data inválida/passada', async () => {
    const reply = createReply();

    await createAgendamento(
      { user, body: { itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: 1, executarEm: 'abc' } } as any,
      reply
    );
    expect(reply.status).toHaveBeenCalledWith(400);

    const reply2 = createReply();
    await createAgendamento(
      { user, body: { itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: 1, executarEm: new Date(Date.now() - 1000).toISOString() } } as any,
      reply2
    );
    expect(reply2.status).toHaveBeenCalledWith(400);
  });

  it('cancelAgendamento -> 404 inexistente', async () => {
    const reply = createReply();
    await cancelAgendamento({ params: { id: '9999' }, user } as any, reply);
    expect(reply.status).toHaveBeenCalledWith(404);
  });

  it('cancelAgendamento -> 409 já executado', async () => {
    const ag = await prisma.transferenciaAgendada.create({
      data: {
        itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: 2,
        usuarioId: 42, executarEm: new Date(Date.now() + 60000),
        status: $Enums.AgendamentoStatus.EXECUTED,
        origemTipo: 'MANUAL' as const,
        motivo: 'X',
      },
    });
    const reply = createReply();
    await cancelAgendamento({ params: { id: String(ag.id) }, user } as any, reply);
    expect(reply.status).toHaveBeenCalledWith(409);
  });

  it('cancelAgendamento -> ok true + notifica', async () => {
    const ag = await prisma.transferenciaAgendada.create({
      data: {
        itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: 2,
        usuarioId: 42, executarEm: new Date(Date.now() + 60000),
        status: $Enums.AgendamentoStatus.PENDING,
        origemTipo: 'MANUAL' as const,
        motivo: 'X',
      },
    });
    const reply = createReply();
    await cancelAgendamento({ params: { id: String(ag.id) }, user } as any, reply);

    expect(reply.send).toHaveBeenCalledWith({ ok: true });
    expect(TelegramService.sendAgendamentoCanceledNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        agendamentoId: ag.id,
        itemNome: 'Notebook QA',
        quantidade: 2,
        estoqueOrigemId: 1001,
        estoqueDestinoId: 1002,
        usuario: 'Tester',
      })
    );
  });

  it('listAgendamentos -> retorna lista ordenada', async () => {
    await prisma.transferenciaAgendada.createMany({
      data: [
        {
          itemId: 5001,
          estoqueOrigemId: 1001,
          estoqueDestinoId: 1002,
          quantidade: 1,
          usuarioId: 42,
          executarEm: new Date(Date.now() + 2000),
          status: $Enums.AgendamentoStatus.PENDING,
          origemTipo: 'MANUAL' as const,
          motivo: 'X',
        },
        {
          itemId: 5001,
          estoqueOrigemId: 1001,
          estoqueDestinoId: 1002,
          quantidade: 2,
          usuarioId: 42,
          executarEm: new Date(Date.now() + 1000),
          status: $Enums.AgendamentoStatus.PENDING,
          origemTipo: 'MANUAL' as const,
          motivo: 'X',
        },
      ],
    });
    const reply = createReply();
    await listAgendamentos({} as any, reply);
    const arr = (reply.send as jest.Mock).mock.calls[0][0];
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBe(2);
    expect(new Date(arr[0].executarEm).getTime()).toBeLessThan(new Date(arr[1].executarEm).getTime());
  });

  it('getAgendamentoById -> 404 quando não encontra', async () => {
    const reply = createReply();
    await getAgendamentoById({ params: { id: '9999' } } as any, reply);
    expect(reply.status).toHaveBeenCalledWith(404);
  });

  it('getAgendamentoById -> retorna agendamento', async () => {
    const ag = await prisma.transferenciaAgendada.create({
      data: {
        itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: 5,
        usuarioId: 42, executarEm: new Date(Date.now() + 60000),
        status: $Enums.AgendamentoStatus.PENDING,
        origemTipo: 'MANUAL' as const,
        motivo: 'X',
      },
    });
    const reply = createReply();
    await getAgendamentoById({ params: { id: String(ag.id) } } as any, reply);
    const payload = (reply.send as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ id: ag.id, quantidade: 5, status: 'PENDING' });
  });

  it('postExecutarAgendamento -> delega para service', async () => {
    const reply = createReply();
    await postExecutarAgendamento({ params: { id: '123' } } as any, reply);
    expect(agSrv.executarAgendamento).toHaveBeenCalledWith(123);
    expect(reply.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it('postExecutarAgendamento -> 400 id inválido', async () => {
    const reply = createReply();
    await postExecutarAgendamento({ params: { id: 'NaN' } } as any, reply);
    expect(reply.code).toHaveBeenCalledWith(400);
  });

  it('postExecutarPendentes -> delega com limit parseado', async () => {
    const reply = createReply();
    await postExecutarPendentes({ query: { limit: '7' } } as any, reply);
    expect(agSrv.executarPendentes).toHaveBeenCalledWith(7);
    expect(reply.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it('getAutoPendentes -> filtra por itemId e estoqueId', async () => {
    await prisma.transferenciaAgendada.createMany({
      data: [
        { itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: 1, usuarioId: 42, executarEm: new Date(Date.now() + 60000), status: $Enums.AgendamentoStatus.PENDING, origemTipo: 'AUTO' as const },
        { itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1003, quantidade: 1, usuarioId: 42, executarEm: new Date(Date.now() + 60000), status: $Enums.AgendamentoStatus.PENDING, origemTipo: 'AUTO' as const },
        { itemId: 5002, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: 1, usuarioId: 42, executarEm: new Date(Date.now() + 60000), status: $Enums.AgendamentoStatus.PENDING, origemTipo: 'AUTO' as const },
        { itemId: 5001, estoqueOrigemId: 1001, estoqueDestinoId: 1002, quantidade: 1, usuarioId: 42, executarEm: new Date(Date.now() + 60000), status: $Enums.AgendamentoStatus.EXECUTED, origemTipo: 'AUTO' as const },
      ],
    });

    const reply1 = createReply();
    await getAutoPendentes({ query: { itemId: 5001 } } as any, reply1);
    const rows1 = (reply1.send as jest.Mock).mock.calls[0][0];
    expect(rows1.every((r: any) => r.status === 'PENDING' && r.origemTipo === 'AUTO' && r.itemId === 5001)).toBe(true);

    const reply2 = createReply();
    await getAutoPendentes({ query: { estoqueId: 1002 } } as any, reply2);
    const rows2 = (reply2.send as jest.Mock).mock.calls[0][0];
    expect(rows2.every((r: any) => r.status === 'PENDING' && r.origemTipo === 'AUTO' && r.estoqueDestinoId === 1002)).toBe(true);
  });

  it('runAutoRepos -> 400 valida body', async () => {
    const reply = createReply();
    await runAutoRepos({ body: { estoqueId: undefined, itemId: 1 } } as any, reply);
    expect(reply.code).toHaveBeenCalledWith(400);

    const reply2 = createReply();
    await runAutoRepos({ body: { estoqueId: 1, itemId: undefined } } as any, reply2);
    expect(reply2.code).toHaveBeenCalledWith(400);
  });

  it('runAutoRepos -> ok true', async () => {
    const reply = createReply();
    await runAutoRepos({ body: { estoqueId: 1001, itemId: 5001 } } as any, reply);
    expect(alertas.checarLimitesEGerenciarAlertas).toHaveBeenCalledWith(1001, 5001);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });
});
