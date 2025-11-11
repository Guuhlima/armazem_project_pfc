import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma';
import { MovQueryType } from '../schemas/movimentacoes.schema';
import { parseDateLoose, truncBucket } from '../utils/utils';

type LinhaAgg = {
  itemId: number;
  itemNome: string;
  estoqueId: number;
  estoqueNome: string;
  bucket: string;
  entradas: number;
  saidas: number;
  tipos: string[];
};

// Relatorio de movimentações de equipamentos
export async function relatorioMovimentacoesController(
  req: FastifyRequest<{ Querystring: MovQueryType }>,
  reply: FastifyReply
) {
  try {
    const { itemId, estoqueId, granularity = 'day' } = req.query as any;

    const now = new Date();
    const fim    = parseDateLoose((req.query as any).fim)    ?? now;
    const inicio = parseDateLoose((req.query as any).inicio) ?? new Date(fim.getTime() - 7*24*60*60*1000);
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return reply.status(400).send({ error: 'inicio/fim inválidos. Use ISO 8601 ou YYYY-MM-DD.' });
    if (fim <= inicio) return reply.status(400).send({ error: 'fim deve ser maior que inicio.' });

    const item = itemId ? Number(itemId) : undefined;
    const est  = estoqueId ? Number(estoqueId) : undefined;

    const transferencias = await prisma.transferencia.findMany({
      where: {
        ...(item ? { itemId: item } : {}),
        ...(est ? { OR: [{ estoqueOrigemId: est }, { estoqueDestinoId: est }] } : {}),
        dataTransferencia: { gte: inicio, lte: fim },
      },
      select: {
        itemId: true,
        estoqueOrigemId: true,
        estoqueDestinoId: true,
        quantidade: true,
        dataTransferencia: true,
      }
    });

    const agendadas = await prisma.transferenciaAgendada.findMany({
      where: {
        status: 'PENDING',
        executarEm: { gte: inicio, lte: fim },
        ...(item ? { itemId: item } : {}),
        ...(est ? { OR: [{ estoqueOrigemId: est }, { estoqueDestinoId: est }] } : {})
      },
      select: {
        itemId: true,
        estoqueOrigemId: true,
        estoqueDestinoId: true,
        quantidade: true,
        executarEm: true,
      }
    });

    const itemIds = new Set<number>();
    const estoqueIds = new Set<number>();
    for (const t of transferencias) {
      itemIds.add(t.itemId);
      estoqueIds.add(t.estoqueOrigemId);
      estoqueIds.add(t.estoqueDestinoId);
    }
    for (const a of agendadas) {
      itemIds.add(a.itemId);
      estoqueIds.add(a.estoqueOrigemId);
      estoqueIds.add(a.estoqueDestinoId);
    }

    const [itens, estoques] = await Promise.all([
      prisma.equipamento.findMany({ where: { id: { in: Array.from(itemIds) } }, select: { id: true, nome: true } }),
      prisma.estoque.findMany({ where: { id: { in: Array.from(estoqueIds) } }, select: { id: true, nome: true } }),
    ]);

    const itemNomeById = new Map(itens.map(i => [i.id, i.nome ?? `#${i.id}`]));
    const estoqueNomeById = new Map(estoques.map(e => [e.id, e.nome ?? `#${e.id}`]));

    type Mov = {
      itemId:number; itemNome:string;
      estoqueId:number; estoqueNome:string;
      ts:Date; qtd:number;
      tipo:'TRANSFER_OUT'|'TRANSFER_IN';
    };
    const movReais: Mov[] = [];
    for (const t of transferencias) {
      const ts: Date = t.dataTransferencia ?? new Date();
      if (!est || est === t.estoqueOrigemId) {
        movReais.push({
          itemId: t.itemId,
          itemNome: itemNomeById.get(t.itemId) ?? `#${t.itemId}`,
          estoqueId: t.estoqueOrigemId,
          estoqueNome: estoqueNomeById.get(t.estoqueOrigemId) ?? `#${t.estoqueOrigemId}`,
          ts, qtd: -t.quantidade, tipo: 'TRANSFER_OUT'
        });
      }
      if (!est || est === t.estoqueDestinoId) {
        movReais.push({
          itemId: t.itemId,
          itemNome: itemNomeById.get(t.itemId) ?? `#${t.itemId}`,
          estoqueId: t.estoqueDestinoId,
          estoqueNome: estoqueNomeById.get(t.estoqueDestinoId) ?? `#${t.estoqueDestinoId}`,
          ts, qtd: +t.quantidade, tipo: 'TRANSFER_IN'
        });
      }
    }

    type MovProj = {
      itemId:number; itemNome:string;
      estoqueId:number; estoqueNome:string;
      ts:Date; qtd:number;
      tipo:'SCHEDULED_OUT'|'SCHEDULED_IN';
    };
    const movProj: MovProj[] = [];
    for (const a of agendadas) {
      const ts = a.executarEm;
      if (!est || est === a.estoqueOrigemId) {
        movProj.push({
          itemId: a.itemId,
          itemNome: itemNomeById.get(a.itemId) ?? `#${a.itemId}`,
          estoqueId: a.estoqueOrigemId,
          estoqueNome: estoqueNomeById.get(a.estoqueOrigemId) ?? `#${a.estoqueOrigemId}`,
          ts, qtd: -a.quantidade, tipo: 'SCHEDULED_OUT'
        });
      }
      if (!est || est === a.estoqueDestinoId) {
        movProj.push({
          itemId: a.itemId,
          itemNome: itemNomeById.get(a.itemId) ?? `#${a.itemId}`,
          estoqueId: a.estoqueDestinoId,
          estoqueNome: estoqueNomeById.get(a.estoqueDestinoId) ?? `#${a.estoqueDestinoId}`,
          ts, qtd: +a.quantidade, tipo: 'SCHEDULED_IN'
        });
      }
    }

    // --------- Agregação por bucket ----------
    const byBucket = new Map<string, LinhaAgg>();
    const bump = (m: {
      itemId:number; itemNome:string;
      estoqueId:number; estoqueNome:string;
      ts:Date; qtd:number; tipo:string;
      origem:'REAL'|'PROJ';
    }) => {
      const bucket = truncBucket(m.ts, granularity);
      const k = `${m.itemId}:${m.estoqueId}:${bucket}`;
      if (!byBucket.has(k)) {
        byBucket.set(k, {
          itemId: m.itemId,
          itemNome: m.itemNome,
          estoqueId: m.estoqueId,
          estoqueNome: m.estoqueNome,
          bucket,
          entradas: 0,
          saidas: 0,
          tipos: [],
        });
      }
      const agg = byBucket.get(k)!;
      if (m.qtd > 0) agg.entradas += m.qtd;
      if (m.qtd < 0) agg.saidas   += (-m.qtd);
      if (!agg.tipos.includes(m.tipo)) agg.tipos.push(m.tipo);
    };

    for (const r of movReais) bump({ ...r, origem:'REAL' });
    for (const p of movProj)  bump({ ...p, origem:'PROJ'  });

    const linhasOut = [...byBucket.values()].sort(
      (a,b)=>
        a.bucket.localeCompare(b.bucket) ||
        a.itemNome.localeCompare(b.itemNome) ||
        a.estoqueNome.localeCompare(b.estoqueNome)
    );

    return reply.send({
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString(), granularity },
      filtros: { itemId: item ?? null, estoqueId: est ?? null },
      linhas: linhasOut
    });

  } catch (e:any) {
    req.log.error(e, 'Erro no relatório de movimentações (ORM)');
    return reply.status(500).send({ error: 'Erro ao gerar relatório de movimentações' });
  }
}