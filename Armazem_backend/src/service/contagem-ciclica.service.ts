import { prisma } from "../lib/prisma";

type AbcClasse = "A" | "B" | "C";
type CountStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "RECOUNT_REQUIRED"
  | "CLOSED"
  | "CANCELED";

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

const DEFAULT_FREQ_DIAS = Number(process.env.CC_FREQ_DEFAULT_DIAS ?? 30);
const DEFAULT_TOLERANCIA_PCT = Number(process.env.CC_TOLERANCIA_DEFAULT ?? 0);
const DEFAULT_CONTAGEM_DUPLA = false;
const DEFAULT_BLOQUEAR_MOV = false;

async function ensurePoliticaForItem(
  estoqueId: number,
  itemId: number,
  classeAbc?: AbcClasse | null
) {
  // 1) tenta achar alguma política existente
  let politica = await resolvePolitica(estoqueId, itemId, classeAbc ?? undefined);
  if (politica) return politica;

  // 2) se não existir, cria política default para esse item específico
  politica = await prisma.contagemCiclicaPolitica.create({
    data: {
      estoqueId,
      itemId,
      classeAbc: classeAbc ?? null,
      ativa: true,
      frequenciaDias: DEFAULT_FREQ_DIAS,
      toleranciaPct: DEFAULT_TOLERANCIA_PCT,
      contagemDupla: DEFAULT_CONTAGEM_DUPLA,
      bloquearMov: DEFAULT_BLOQUEAR_MOV,
    },
  });

  return politica;
}

/** Resolve a política aplicável (item > classe > default do estoque) */
async function resolvePolitica(
  estoqueId: number,
  itemId: number,
  classeAbc?: AbcClasse | null
) {
  const politicas = await prisma.contagemCiclicaPolitica.findMany({
    where: {
      estoqueId,
      ativa: true,
      OR: [
        { itemId },
        { classeAbc: classeAbc ?? undefined },
        { itemId: null, classeAbc: null },
      ],
    },
    orderBy: [{ itemId: "desc" }, { classeAbc: "desc" }],
    take: 1,
  });
  return politicas[0] ?? null;
}

/** CRON: gerar tarefas vencidas (pendentes) para hoje */
export async function gerarTarefasVencidas() {
  const now = new Date();
  const itens = await prisma.estoqueItem.findMany({
    include: { item: { select: { id: true } } },
  });

  let total = itens.length;
  let semPolitica = 0;
  let naoPrecisam = 0;
  let criadas = 0;

  console.log('[ContagemCiclica] Itens encontrados:', total);

  for (const it of itens) {
    const politica = await ensurePoliticaForItem(
  it.estoqueId,
  it.itemId,
  it.classeAbc as AbcClasse | undefined
);
    if (!politica) {
      semPolitica++;
      continue;
    }

    const precisa = !it.nextCountDueAt || it.nextCountDueAt <= now;
    if (!precisa) {
      naoPrecisam++;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.contagemCiclicaTarefa.create({
        data: {
          estoqueId: it.estoqueId,
          itemId: it.itemId,
          status: "PENDING",
          dueAt: now,
          politicaId: politica.id,
          toleranciaPct: politica.toleranciaPct,
          contagemDupla: politica.contagemDupla,
          bloquearMov: politica.bloquearMov,
        },
      });
      await tx.estoqueItem.update({
        where: { id: it.id },
        data: { nextCountDueAt: addDays(now, politica.frequenciaDias) },
      });
    });

    criadas++;
  }

  console.log('[ContagemCiclica] resumo geração:', {
    total,
    semPolitica,
    naoPrecisam,
    criadas,
  });

  return { ok: true, criadas, total, semPolitica, naoPrecisam };
}

/** Lista tarefas (com filtros simples) */
export async function listarTarefas(params?: { status?: CountStatus }) {
  return prisma.contagemCiclicaTarefa.findMany({
    where: { status: params?.status },
    include: { item: true, estoque: true, lancamentos: true },
    orderBy: [{ dueAt: "asc" }],
  });
}

/** Inicia a tarefa: tira snapshot do saldo e (opcionalmente) aplica o “lock lógico” */
export async function iniciarTarefa(tarefaId: number, userId: number) {
  return prisma.$transaction(async (tx) => {
    const tarefa = await tx.contagemCiclicaTarefa.findUnique({
      where: { id: tarefaId },
    });
    if (!tarefa || tarefa.status !== "PENDING") {
      return { ok: false, reason: "INVALID_STATUS_OR_NOT_FOUND" };
    }

    const itemEstoque = await tx.estoqueItem.findFirst({
      where: { estoqueId: tarefa.estoqueId, itemId: tarefa.itemId },
    });

    const systemQty = itemEstoque?.quantidade ?? 0;

    const updated = await tx.contagemCiclicaTarefa.update({
      where: { id: tarefaId },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
        systemQtyAtStart: systemQty,
        createdById: userId,
      },
    });

    return { ok: true, tarefa: updated };
  });
}

/** Lança contagem (primeira ou reconte); aplica tolerância e gera ajuste se necessário */
export async function lancarContagem(
  tarefaId: number,
  userId: number,
  quantidade: number
) {
  return prisma.$transaction(async (tx) => {
    const tarefa = await tx.contagemCiclicaTarefa.findUnique({
      where: { id: tarefaId },
    });

    if (
      !tarefa ||
      !["IN_PROGRESS", "RECOUNT_REQUIRED"].includes(tarefa.status)
    ) {
      return { ok: false, reason: "INVALID_STATUS_OR_NOT_FOUND" };
    }

    const usuario = await tx.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nome: true, email: true },
    });

    if (tarefa.status === "RECOUNT_REQUIRED") {
      const first = await tx.contagemCiclicaLancamento.findFirst({
        where: { tarefaId, tentativa: 1 },
      });
      if (first?.contadoPorId === userId) {
        return { ok: false, reason: "RECOUNT_MUST_BE_DIFFERENT_USER" };
      }
    }

    const tentativas = await tx.contagemCiclicaLancamento.count({
      where: { tarefaId },
    });
    const tentativa = tentativas + 1;

    await tx.contagemCiclicaLancamento.create({
      data: { tarefaId, tentativa, quantidade, contadoPorId: userId },
    });

    const base = tarefa.systemQtyAtStart ?? 0;
    const diffAbs = Math.abs(quantidade - base);
    const pct = base === 0 ? (diffAbs > 0 ? 100 : 0) : (diffAbs / base) * 100;
    const tol = tarefa.toleranciaPct ?? 0;

    if (pct <= tol) {
      await tx.contagemCiclicaTarefa.update({
        where: { id: tarefaId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          resolution: "WITHIN_TOLERANCE",
          finalQty: base,
        },
      });

      await bumpNextDueAt_tx(tx, tarefa);
      return { ok: true, closed: true, adjusted: false };
    }

    if ((tarefa.contagemDupla ?? false) && tentativa === 1) {
      await tx.contagemCiclicaTarefa.update({
        where: { id: tarefaId },
        data: { status: "RECOUNT_REQUIRED" },
      });
      return { ok: true, recount: true, closed: false };
    }

    const delta = quantidade - base;

    const mov = await tx.movEstoque.create({
      data: {
        itemId: tarefa.itemId,
        estoqueOrigemId: delta < 0 ? tarefa.estoqueId : null,
        estoqueDestinoId: delta > 0 ? tarefa.estoqueId : null,
        quantidade: Math.abs(delta),
        tipoEvento: "AJUSTE_CC",
        referenciaTabela: "contagem_ciclica",
        referenciaId: tarefaId,

        usuarioId: usuario?.id ?? null,
        usuarioNome: usuario?.nome ?? null,
        usuarioEmail: usuario?.email ?? null,
      },
    });

    await tx.estoqueItem.updateMany({
      where: {
        estoqueId: tarefa.estoqueId,
        itemId: tarefa.itemId,
      },
      data: {
        quantidade,
      },
    });

    await tx.contagemCiclicaTarefa.update({
      where: { id: tarefaId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        resolution: "ADJUSTED",
        finalQty: quantidade,
        ajusteMovId: mov.id,
      },
    });

    await bumpNextDueAt_tx(tx, tarefa);

    return {
      ok: true,
      closed: true,
      adjusted: true,
      delta,
      newQty: quantidade,
    };
  });
}

// Cancela uma tarefa (não mexe em saldo) 
export async function cancelarTarefa(tarefaId: number, motivo?: string) {
  const t = await prisma.contagemCiclicaTarefa.findUnique({
    where: { id: tarefaId },
  });
  if (
    !t ||
    !["PENDING", "IN_PROGRESS", "RECOUNT_REQUIRED"].includes(t.status)
  ) {
    return { ok: false, reason: "INVALID_STATUS_OR_NOT_FOUND" };
  }
  await prisma.contagemCiclicaTarefa.update({
    where: { id: tarefaId },
    data: {
      status: "CANCELED",
      closedAt: new Date(),
      ...(motivo ? { cancelReason: motivo } : {}),
    },
  });
  return { ok: true };
}

/** Atualiza last/next do item conforme a política usada */
async function bumpNextDueAt_tx(tx: any, tarefa: any) {
  const politica = tarefa.politicaId
    ? await tx.contagemCiclicaPolitica.findUnique({
        where: { id: tarefa.politicaId },
      })
    : null;

  const now = new Date();
  const prox = addDays(now, politica?.frequenciaDias ?? 30);

  await tx.estoqueItem.updateMany({
    where: { estoqueId: tarefa.estoqueId, itemId: tarefa.itemId },
    data: { lastCountedAt: now, nextCountDueAt: prox },
  });
}

// Utilitário: bloqueio de movimentação 
export async function verificarBloqueioContagem(
  estoqueId: number,
  itemId: number
) {
  const lock = await prisma.contagemCiclicaTarefa.findFirst({
    where: { estoqueId, itemId, status: "IN_PROGRESS", bloquearMov: true },
  });
  return !!lock;
}