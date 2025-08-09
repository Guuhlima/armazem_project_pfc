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

  it('visualizarEquipamentos -> lista', async () => {
    await prisma.equipamento.create({
      data: { nome: 'Serra', quantidade: 1, data: new Date('2025-08-09') },
    });

    const reply = createReply();
    await visualizarEquipamentos({} as any, reply);

    expect(reply.send).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ nome: 'Serra', quantidade: 1 }),
      ])
    );
  });

  it('visualizarEquipamentosPorId -> 404 quando não encontra', async () => {
    const reply = createReply();
    await visualizarEquipamentosPorId({ params: { id: '999' } } as any, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Equipamento não encontrado' });
  });

  it('editarEquipamento -> edita e retorna', async () => {
    const created = await prisma.equipamento.create({
      data: { nome: 'Velha', quantidade: 1, data: new Date('2025-08-09') },
    });

    const reply = createReply();
    await editarEquipamento(
      { params: { id: String(created.id) }, body: { nome: 'Nova', quantidade: 5, data: '2025-08-10' } } as any,
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
    await deletarEquipamento({ params: { id: String(created.id) } } as any, reply);

    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ id: created.id }));
    const after = await prisma.equipamento.findUnique({ where: { id: created.id } });
    expect(after).toBeNull();
  });
});
