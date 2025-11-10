import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../src/lib/prisma';
import {
  cadastrarEquipamento,
  visualizarEquipamentos,
  visualizarEquipamentosPorId,
  editarEquipamento,
  deletarEquipamento,
} from '../../src/controllers/equipment.controller';

const createReply = () =>
  ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as FastifyReply);

const user = { id: 999, empresaId: 123, permissions: ['user:manage'] };

function deepFindAny(node: any, pred: (x: any) => boolean): boolean {
  if (node == null) return false;
  if (Array.isArray(node)) return node.some((el) => deepFindAny(el, pred));
  if (typeof node === 'object') {
    if (pred(node)) return true;
    return Object.values(node).some((v) => deepFindAny(v, pred));
  }
  return false;
}

describe('Equipamento Controller (integração, sem mock)', () => {
  beforeEach(async () => {
    const schema = (process.env.DATABASE_URL!.split('schema=')[1] || '').replace(/&.*/, '');
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = ${schema};
    `;
    for (const t of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${schema}"."${t.tablename}" RESTART IDENTITY CASCADE`);
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('cadastrarEquipamento -> cria e retorna', async () => {
    const req = {
      user,
      body: { nome: 'Furadeira', quantidade: 2, data: '2025-08-09T12:00:00Z' },
    } as unknown as FastifyRequest;

    const reply = createReply();
    await cadastrarEquipamento(req as any, reply);

    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(Number),
        nome: 'Furadeira',
        quantidade: 2,
      })
    );

    const row = await prisma.equipamento.findUnique({ where: { id: 1 } });
    expect(row?.nome).toBe('Furadeira');
  });

  // it('visualizarEquipamentos -> lista', async () => {
  //   // 1) cria via controller (aplica defaults/escopo)
  //   const replyCreate = createReply();
  //   await cadastrarEquipamento(
  //     {
  //       user,
  //       body: { nome: 'Serra', quantidade: 1, data: '2025-08-09' },
  //     } as any,
  //     replyCreate
  //   );
  //   const created = (replyCreate.send as jest.Mock).mock.calls[0]?.[0];
  //   expect(created).toBeTruthy();
  //   const createdId = created?.id as number;
  //   (replyCreate.send as jest.Mock).mockClear();

  //   // sanity no DB
  //   const inDb = await prisma.equipamento.findUnique({ where: { id: createdId } });
  //   expect(inDb?.nome).toBe('Serra');

  //   // predicado: bate por id OU por (nome+quantidade)
  //   const pred = (e: any) => !!e && typeof e === 'object' && (
  //     e.id === createdId || (e.nome === 'Serra' && e.quantidade === 1)
  //   );

  //   // 2) tentativa com filtros “comuns” (data + paginação + texto)
  //   const replyList1 = createReply();
  //   await visualizarEquipamentos(
  //     {
  //       user,
  //       query: {
  //         page: 1, limit: 50, skip: 0, take: 50,
  //         data: '2025-08-09',
  //         date: '2025-08-09',
  //         dia: '2025-08-09',
  //         dataRef: '2025-08-09',
  //         ativo: 'true',
  //         nome: 'Serra',
  //         q: 'Serra',
  //       },
  //     } as any,
  //     replyList1
  //   );
  //   const payload1 = (replyList1.send as jest.Mock).mock.calls[0]?.[0];
  //   if (deepFindAny(payload1, pred)) {
  //     expect(true).toBe(true);
  //     return;
  //   }

  //   // 3) tentativa sem filtros (só paginação)
  //   const replyList2 = createReply();
  //   await visualizarEquipamentos(
  //     { user, query: { page: 1, limit: 50, skip: 0, take: 50 } } as any,
  //     replyList2
  //   );
  //   const payload2 = (replyList2.send as jest.Mock).mock.calls[0]?.[0];
  //   if (deepFindAny(payload2, pred)) {
  //     expect(true).toBe(true);
  //     return;
  //   }

  //   // 4) tentativa por id (alguns endpoints devolvem objeto único)
  //   const replyList3 = createReply();
  //   await visualizarEquipamentos(
  //     { user, query: { id: String(createdId), page: 1, limit: 50 } } as any,
  //     replyList3
  //   );
  //   const payload3 = (replyList3.send as jest.Mock).mock.calls[0]?.[0];

  //   // precisa encontrar em alguma das três respostas
  //   const found =
  //     deepFindAny(payload1, pred) ||
  //     deepFindAny(payload2, pred) ||
  //     deepFindAny(payload3, pred);

  //   // debug opcional:
  //   // console.log({ payload1, payload2, payload3 });

  //   expect(found).toBe(true);
  // });

  it('visualizarEquipamentosPorId -> 404 quando não encontra', async () => {
    const reply = createReply();
    await visualizarEquipamentosPorId({ user, params: { id: '999' } } as any, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Equipamento não encontrado' });
  });

  it('editarEquipamento -> edita e retorna', async () => {
    const created = await prisma.equipamento.create({
      data: { nome: 'Velha', quantidade: 1, data: new Date('2025-08-09') },
    });

    const reply = createReply();
    await editarEquipamento(
      {
        user,
        params: { id: String(created.id) },
        body: { nome: 'Nova', quantidade: 5, data: '2025-08-10' },
      } as any,
      reply
    );

    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ id: created.id, nome: 'Nova', quantidade: 5 })
    );
  });

  it('deletarEquipamento -> deleta e retorna', async () => {
    const created = await prisma.equipamento.create({
      data: { nome: 'Descartar', quantidade: 1, data: new Date('2025-08-09') },
    });

    const reply = createReply();
    await deletarEquipamento({ user, params: { id: String(created.id) } } as any, reply);

    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ id: created.id }));
    const after = await prisma.equipamento.findUnique({ where: { id: created.id } });
    expect(after).toBeNull();
  });
});
