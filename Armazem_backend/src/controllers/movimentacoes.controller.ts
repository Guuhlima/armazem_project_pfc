import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma';
import { MovQueryType } from '../schemas/movimentacoes.schema';

type LinhaAgg = {
  itemId: number;
  estoqueId: number;
  bucket: string;
  entradas: number;
  saidas: number;
  real: number;
  projetado: number;
  tipos: string[];
};

const truncBucket = (d: Date, gran: 'day'|'hour') => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  if (gran === 'hour') {
    const hh = String(d.getHours()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd} ${hh}:00:00`;
  }
  return `${yyyy}-${mm}-${dd}`;
};

const parseDateLoose = (s?: string) => {
  if (!s) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
};

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

    const whereTransfPeriodo: any = {
      ...(item ? { itemId: item } : {}),
      ...(est ? { OR: [{ estoqueOrigemId: est }, { estoqueDestinoId: est }] } : {}),
      dataTransferencia: { gte: inicio, lte: fim },
    };

    const transferencias = await prisma.transferencia.findMany({
      where: whereTransfPeriodo,
      select: {
        itemId: true,
        estoqueOrigemId: true,
        estoqueDestinoId: true,
        quantidade: true,
        dataTransferencia: true,
      }
    });

    type Mov = { itemId:number; estoqueId:number; ts:Date; qtd:number; tipo:'TRANSFER_OUT'|'TRANSFER_IN' };
    const movReais: Mov[] = [];
    for (const t of transferencias) {
      const ts: Date = t.dataTransferencia ?? new Date();
      if (!est || est === t.estoqueOrigemId) {
        movReais.push({ itemId: t.itemId, estoqueId: t.estoqueOrigemId, ts, qtd: -t.quantidade, tipo: 'TRANSFER_OUT' });
      }
      if (!est || est === t.estoqueDestinoId) {
        movReais.push({ itemId: t.itemId, estoqueId: t.estoqueDestinoId, ts, qtd: +t.quantidade, tipo: 'TRANSFER_IN' });
      }
    }

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

    type MovProj = { itemId:number; estoqueId:number; ts:Date; qtd:number; tipo:'SCHEDULED_OUT'|'SCHEDULED_IN' };
    const movProj: MovProj[] = [];
    for (const a of agendadas) {
      const ts = a.executarEm;
      if (!est || est === a.estoqueOrigemId) {
        movProj.push({ itemId: a.itemId, estoqueId: a.estoqueOrigemId, ts, qtd: -a.quantidade, tipo: 'SCHEDULED_OUT' });
      }
      if (!est || est === a.estoqueDestinoId) {
        movProj.push({ itemId: a.itemId, estoqueId: a.estoqueDestinoId, ts, qtd: +a.quantidade, tipo: 'SCHEDULED_IN' });
      }
    }

    const whereTransfAntes: any = {
      ...(item ? { itemId: item } : {}),
      ...(est ? { OR: [{ estoqueOrigemId: est }, { estoqueDestinoId: est }] } : {}),
      dataTransferencia: { lt: inicio },
    };

    const transfAntes = await prisma.transferencia.findMany({
      where: whereTransfAntes,
      select: {
        itemId: true,
        estoqueOrigemId: true,
        estoqueDestinoId: true,
        quantidade: true,
        dataTransferencia: true,
      }
    });

    const saldoInicialMap = new Map<string, number>();
    const keyIE = (i:number,e:number)=>`${i}:${e}`;
    for (const t of transfAntes) {
      const kOut = keyIE(t.itemId, t.estoqueOrigemId);
      const kIn  = keyIE(t.itemId, t.estoqueDestinoId);
      saldoInicialMap.set(kOut, (saldoInicialMap.get(kOut) ?? 0) - t.quantidade);
      saldoInicialMap.set(kIn,  (saldoInicialMap.get(kIn)  ?? 0) + t.quantidade);
    }

    const byBucket = new Map<string, LinhaAgg>();
    const bump = (m:{ itemId:number; estoqueId:number; ts:Date; qtd:number; tipo:string; origem:'REAL'|'PROJ'; }) => {
      const bucket = truncBucket(m.ts, granularity);
      const k = `${m.itemId}:${m.estoqueId}:${bucket}`;
      if (!byBucket.has(k)) {
        byBucket.set(k, { itemId: m.itemId, estoqueId: m.estoqueId, bucket,
          entradas: 0, saidas: 0, real: 0, projetado: 0, tipos: [] });
      }
      const agg = byBucket.get(k)!;
      if (m.origem === 'REAL') {
        agg.real += m.qtd;
        if (m.qtd > 0) agg.entradas += m.qtd;
        if (m.qtd < 0) agg.saidas   += (-m.qtd);
      } else {
        agg.projetado += m.qtd;
      }
      if (!agg.tipos.includes(m.tipo)) agg.tipos.push(m.tipo);
    };

    for (const r of movReais) bump({ ...r, origem:'REAL' });
    for (const p of movProj)  bump({ ...p, origem:'PROJ'  });

    const rows = [...byBucket.values()].sort((a,b)=>
      a.bucket.localeCompare(b.bucket) || a.itemId - b.itemId || a.estoqueId - b.estoqueId
    );

    const accMap = new Map<string, number>(saldoInicialMap);
    const linhasOut: any[] = [];
    for (const r of rows) {
      const k = keyIE(r.itemId, r.estoqueId);
      const prev  = accMap.get(k) ?? 0;
      const saldo = prev + r.real;
      const atp   = saldo + r.projetado;
      accMap.set(k, saldo);
      linhasOut.push({
        itemId: r.itemId, estoqueId: r.estoqueId, bucket: r.bucket,
        entradas: r.entradas, saidas: r.saidas, saldo, atp, tipos: r.tipos
      });
    }

    return reply.send({
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString(), granularity },
      filtros: { itemId: item ?? null, estoqueId: est ?? null },
      saldoInicial: [...saldoInicialMap.entries()].map(([k,v])=>{
        const [i,e]=k.split(':').map(Number); return { itemId:i, estoqueId:e, saldo:v };
      }),
      linhas: linhasOut
    });

  } catch (e:any) {
    req.log.error(e, 'Erro no relatório de movimentações (ORM)');
    return reply.status(500).send({ error: 'Erro ao gerar relatório de movimentações' });
  }
}
