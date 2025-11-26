import { PrismaClient, RastreioTipo } from '@prisma/client';
const prisma = new PrismaClient();

/** Helpers *******************************************************************/

async function getItemOrThrow(itemId: number) {
  const item = await prisma.equipamento.findUnique({ where: { id: itemId } });
  if (!item) throw new Error(`Item ${itemId} não encontrado`);
  return item;
}

async function ensureLote(itemId: number, codigo: string, validade?: Date | null) {
  return prisma.lote.upsert({
    where: { unique_lote_por_item: { itemId, codigo } as any }, // Prisma gera o nome do where composto
    update: validade ? { validade } : {},
    create: { itemId, codigo, validade: validade ?? null },
  });
}

async function ensureSerial(itemId: number, numero: string, loteId?: number | null) {
  const data: any = { itemId, numero };
  if (loteId) data.loteId = loteId;
  return prisma.serial.upsert({
    where: { numero },
    update: data,
    create: data,
  });
}

function assertRastreio(itemRastreio: RastreioTipo, loteId?: number | null, serialId?: number | null) {
  if (itemRastreio === 'NONE' && (loteId || serialId))
    throw new Error('Item não usa lote/serial');
}

async function assertValidadeOk(loteId?: number | null) {
  if (!loteId) return;
  const lote = await prisma.lote.findUnique({ where: { id: loteId } });
  if (!lote) throw new Error(`Lote ${loteId} não encontrado`);
  if (lote.validade && new Date(lote.validade).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)) {
    throw new Error(`Lote ${lote.codigo} vencido (${lote.validade.toISOString().slice(0,10)})`);
  }
}


export async function saldoPorLote(itemId: number, estoqueId: number) {
  return prisma.$queryRaw<
    { lote_id: number; codigo: string; validade: Date | null; saldo: number }[]
  >`
    WITH mov AS (
      SELECT
        "loteId",
        CASE WHEN "estoqueDestinoId" = ${estoqueId} THEN quantidade ELSE 0 END AS q_in,
        CASE WHEN "estoqueOrigemId"  = ${estoqueId} THEN quantidade ELSE 0 END AS q_out
      FROM "mov_estoque"
      WHERE "itemId" = ${itemId} AND "loteId" IS NOT NULL
    ),
    agg AS (
      SELECT "loteId", SUM(q_in) - SUM(q_out) AS saldo
      FROM mov
      GROUP BY "loteId"
    )
    SELECT l.id as lote_id, l.codigo, l.validade, CAST(a.saldo AS INTEGER) AS saldo  -- 👈 aqui
    FROM agg a
    JOIN "lotes" l ON l.id = a."loteId"
    WHERE a.saldo > 0
    ORDER BY l.validade NULLS LAST, l.id
  `;
}

export async function sugerirFEFO(itemId: number, estoqueId: number, take = 5) {
  const lotes = await saldoPorLote(itemId, estoqueId);
  return lotes.slice(0, take);
}

async function criarMov({
  itemId,
  loteId,
  serialId,
  estoqueOrigemId,
  estoqueDestinoId,
  quantidade,
  tipoEvento,
  referenciaTabela,
  referenciaId,
}: {
  itemId: number;
  loteId?: number | null;
  serialId?: number | null;
  estoqueOrigemId?: number | null;
  estoqueDestinoId?: number | null;
  quantidade: number;
  tipoEvento: string;
  referenciaTabela?: string;
  referenciaId?: number | null;
}) {
  if (quantidade <= 0) throw new Error('quantidade deve ser > 0');
  return prisma.movEstoque.create({
    data: {
      itemId,
      loteId: loteId ?? null,
      serialId: serialId ?? null,
      estoqueOrigemId: estoqueOrigemId ?? null,
      estoqueDestinoId: estoqueDestinoId ?? null,
      quantidade,
      tipoEvento,
      referenciaTabela: referenciaTabela ?? null,
      referenciaId: referenciaId ?? null,
    },
  });
}

export async function receber({
  estoqueId,
  itemId,
  quantidade,
  loteCodigo,
  validade,
  serialNumero,
  referencia,
}: {
  estoqueId: number;
  itemId: number;
  quantidade: number;
  loteCodigo?: string;
  validade?: Date | string | null;
  serialNumero?: string;
  referencia?: { tabela?: string; id?: number };
}) {
  const item = await getItemOrThrow(itemId);

  let loteId: number | null = null;
  let serialId: number | null = null;

  const v = validade ? new Date(validade) : null;

  if (loteCodigo) {
    const lote = await ensureLote(itemId, loteCodigo, v);
    loteId = lote.id;
  }

  if (item.rastreioTipo === 'SERIAL') {
    if (!serialNumero) {
      throw new Error('serialNumero obrigatório para itens SERIAL');
    }
    const serial = await ensureSerial(itemId, serialNumero, loteId ?? undefined);
    serialId = serial.id;
  }

  assertRastreio(item.rastreioTipo, loteId, serialId);

  await prisma.$transaction(async (tx) => {
    await tx.movEstoque.create({
      data: {
        itemId,
        loteId: loteId ?? null,
        serialId: serialId ?? null,
        estoqueDestinoId: estoqueId,
        quantidade,
        tipoEvento: 'IN',
        referenciaTabela: referencia?.tabela ?? null,
        referenciaId: referencia?.id ?? null,
      },
    });

    await tx.estoqueItem.upsert({
      where: { itemId_estoqueId: { itemId, estoqueId } },
      update: { quantidade: { increment: quantidade } },
      create: { itemId, estoqueId, quantidade },
    });

    await tx.equipamento.update({
      where: { id: itemId },
      data: { quantidade: { increment: quantidade } },
    });
  });

  return { ok: true };
}

export async function transferir({
  itemId,
  quantidade,
  origemId,
  destinoId,
  loteId,
  serialId,
  referencia,
}: {
  itemId: number;
  quantidade: number;
  origemId: number;
  destinoId: number;
  loteId?: number | null;
  serialId?: number | null;
  referencia?: { tabela?: string; id?: number };
}) {
  if (quantidade <= 0) {
    throw new Error('Quantidade inválida para transferência');
  }

  const item = await getItemOrThrow(itemId);
  assertRastreio(item.rastreioTipo, loteId, serialId);
  await assertValidadeOk(loteId);

  // Se tiver loteId, você já está garantindo saldo por lote aqui
  if (loteId) {
    const lotes = await saldoPorLote(itemId, origemId);
    const saldo = lotes.find((l) => l.lote_id === loteId)?.saldo ?? 0;
    if (saldo < quantidade) {
      throw new Error(`Saldo insuficiente no lote ${loteId}: ${saldo}`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const origemSnap = await tx.estoqueItem.findUnique({
      where: {
        itemId_estoqueId: {
          itemId,
          estoqueId: origemId,
        },
      },
      select: { quantidade: true },
    });

    if (!origemSnap) {
      throw new Error(
        `Snapshot de estoque não encontrado para item ${itemId} em origem ${origemId}`
      );
    }

    const saldoOrigem = Number(origemSnap.quantidade ?? 0);
    if (saldoOrigem < quantidade) {
      throw new Error(
        `Saldo insuficiente na origem (snapshot). Disponível: ${saldoOrigem}, precisa: ${quantidade}`
      );
    }

    await tx.estoqueItem.update({
      where: {
        itemId_estoqueId: {
          itemId,
          estoqueId: origemId,
        },
      },
      data: {
        quantidade: { decrement: quantidade },
      },
    });

    const destinoSnap = await tx.estoqueItem.findUnique({
      where: {
        itemId_estoqueId: {
          itemId,
          estoqueId: destinoId,
        },
      },
      select: { quantidade: true },
    });

    if (!destinoSnap) {
      await tx.estoqueItem.create({
        data: {
          itemId,
          estoqueId: destinoId,
          quantidade,
        },
      });
    } else {
      await tx.estoqueItem.update({
        where: {
          itemId_estoqueId: {
            itemId,
            estoqueId: destinoId,
          },
        },
        data: {
          quantidade: { increment: quantidade },
        },
      });
    }

    await tx.movEstoque.create({
      data: {
        itemId,
        loteId: loteId ?? null,
        serialId: serialId ?? null,
        estoqueOrigemId: origemId,
        quantidade,
        tipoEvento: 'TRANSF_OUT',
        referenciaTabela: referencia?.tabela ?? null,
        referenciaId: referencia?.id ?? null,
      },
    });

    await tx.movEstoque.create({
      data: {
        itemId,
        loteId: loteId ?? null,
        serialId: serialId ?? null,
        estoqueDestinoId: destinoId,
        quantidade,
        tipoEvento: 'TRANSF_IN',
        referenciaTabela: referencia?.tabela ?? null,
        referenciaId: referencia?.id ?? null,
      },
    });

    return { ok: true };
  });
}

/** 3) Picking FEFO (saída por lotes de menor validade) */
export async function pickingFEFO({
  estoqueId,
  itemId,
  quantidadeSolicitada,
  referencia,
  permitirVencidos
}: {
  estoqueId: number;
  itemId: number;
  quantidadeSolicitada: number;
  referencia?: { tabela?: string; id?: number };
  permitirVencidos?: boolean
}) {
  const item = await getItemOrThrow(itemId);

  if (item.rastreioTipo === 'SERIAL') {
    throw new Error('Para itens SERIAL use a função de saída por serial específico.');
  }

  let restante = quantidadeSolicitada;
  const escolhas = await sugerirFEFO(itemId, estoqueId, 999); // todos com saldo

  const movimentos: { loteId: number; qtd: number }[] = [];

  for (const l of escolhas) {
    if (!permitirVencidos) {
      await assertValidadeOk(l.lote_id);
    }
    
    if (restante <= 0) break;
    const usar = Math.min(restante, Number(l.saldo));
    if (usar > 0) {
      movimentos.push({ loteId: l.lote_id, qtd: usar });
      restante -= usar;
    }
  }

  if (restante > 0) {
    const totalDisp = escolhas.reduce((s, x) => s + Number(x.saldo), 0);
    throw new Error(
      `Saldo insuficiente: pedido=${quantidadeSolicitada}, disponível=${totalDisp}`,
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const m of movimentos) {
      await tx.movEstoque.create({
        data: {
          itemId,
          loteId: m.loteId,
          estoqueOrigemId: estoqueId,
          quantidade: m.qtd,
          tipoEvento: 'OUT',
          referenciaTabela: referencia?.tabela ?? null,
          referenciaId: referencia?.id ?? null,
        },
      });

      await tx.estoqueItem.update({
        where: {
          itemId_estoqueId: {
            itemId,
            estoqueId,
          },
        },
        data: {
          quantidade: { decrement: m.qtd },
        },
      });
    }

    await tx.equipamento.update({
      where: { id: itemId },
      data: {
        quantidade: { decrement: quantidadeSolicitada },
      },
    });
  });

  return { ok: true, lotes: movimentos };
}

/** 4) Saída por SERIAL (para itens serializados) */
export async function saidaPorSerial({
  estoqueId,
  itemId,
  serialNumero,
  referencia,
}: {
  estoqueId: number;
  itemId: number;
  serialNumero: string;
  referencia?: { tabela?: string; id?: number };
}) {
  const item = await getItemOrThrow(itemId);
  if (item.rastreioTipo !== 'SERIAL') throw new Error('Item não é SERIAL');

  const serial = await prisma.serial.findUnique({ where: { numero: serialNumero } });
  if (!serial || serial.itemId !== itemId) {
    throw new Error('Serial não encontrado para o item');
  }

  // Verifica se o serial está presente no estoque (saldo 1)
  const saldoSerial = await prisma.$queryRaw<{ saldo: number }[]>`
    WITH mov AS (
      SELECT
        CASE WHEN "estoqueDestinoId" = ${estoqueId} THEN quantidade ELSE 0 END AS q_in,
        CASE WHEN "estoqueOrigemId"  = ${estoqueId} THEN quantidade ELSE 0 END AS q_out
      FROM "mov_estoque"
      WHERE "serialId" = ${serial.id}
    )
    SELECT COALESCE(SUM(q_in) - SUM(q_out), 0) AS saldo FROM mov
  `;
  const saldo = Number(saldoSerial[0]?.saldo ?? 0);
  if (saldo <= 0) throw new Error('Serial não está disponível neste estoque');

  // Validade do lote do serial, se houver
  await assertValidadeOk(serial.loteId ?? undefined);

  // 🔥 Tudo em transação: movimento + snapshot + total do item
  await prisma.$transaction(async (tx) => {
    // 1) Movimento de saída
    await tx.movEstoque.create({
      data: {
        itemId,
        serialId: serial.id,
        loteId: serial.loteId ?? null,
        estoqueOrigemId: estoqueId,
        quantidade: 1,
        tipoEvento: 'OUT',
        referenciaTabela: referencia?.tabela ?? null,
        referenciaId: referencia?.id ?? null,
      },
    });

    // 2) Snapshot do estoque (estoqueItem)
    await tx.estoqueItem.update({
      where: {
        itemId_estoqueId: {
          itemId,
          estoqueId,
        },
      },
      data: {
        quantidade: { decrement: 1 },
      },
    });

    // 3) Quantidade total na tabela equipamentos
    await tx.equipamento.update({
      where: { id: itemId },
      data: {
        quantidade: { decrement: 1 },
      },
    });
  });

  return { ok: true, serialId: serial.id };
}
