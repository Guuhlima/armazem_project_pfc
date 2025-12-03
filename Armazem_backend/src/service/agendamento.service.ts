// service/agendamentos.service.ts
import { prisma } from "../lib/prisma";
import * as inv from "../service/estoque.service";
import { TelegramService } from "../service/telegram.service";
import { RastreioTipo } from "@prisma/client";
import { sugerirFEFO } from "../service/estoque.service";

const SYSTEM_USER_ID = 1;

export async function executarAgendamento(agendamentoId: number) {
  // pega o agendamento ainda PENDING
  const ag = await prisma.transferenciaAgendada.findFirst({
    where: { id: agendamentoId, status: "PENDING" },
  });
  if (!ag) return { ok: false, reason: "NOT_PENDING_OR_NOT_FOUND" };

  // pega o item para saber o tipo de rastreio
  const item = await prisma.equipamento.findUnique({
    where: { id: ag.itemId },
    select: { nome: true, rastreioTipo: true },
  });
  if (!item) return { ok: false, reason: "ITEM_NOT_FOUND" };

  const usuario =
    ag.usuarioId
      ? await prisma.usuario.findUnique({
          where: { id: ag.usuarioId },
          select: { id: true, nome: true, email: true },
        })
      : null;

  const usuarioSnapshot = {
    id: usuario?.id ?? SYSTEM_USER_ID,
    nome: usuario?.nome ?? "system:auto",
    email: usuario?.email ?? null,
  };

  try {
    if (item.rastreioTipo === RastreioTipo.SERIAL) {
      await prisma.transferenciaAgendada.update({
        where: { id: ag.id },
        data: {
          tentativas: { increment: 1 },
          erroUltimaTentativa: "AUTO indisponível para itens SERIAL (requer serialNumero).",
        },
      });
      return { ok: false, reason: "SERIAL_NOT_SUPPORTED_AUTO" };
    }

    if (item.rastreioTipo === RastreioTipo.LOTE) {
      let restante = ag.quantidade;
      const picks = await sugerirFEFO(ag.itemId, ag.estoqueOrigemId!, 999);

      if (!picks?.length) throw new Error("Sem saldo por lote na origem");

      for (const l of picks) {
        if (restante <= 0) break;
        const usar = Math.min(restante, Number(l.saldo));
        if (usar <= 0) continue;

        await inv.transferir({
          itemId: ag.itemId,
          quantidade: usar,
          origemId: ag.estoqueOrigemId!,
          destinoId: ag.estoqueDestinoId,
          loteId: l.lote_id,
          referencia: { tabela: "transferenciaAgendada", id: ag.id },
          usuario: usuarioSnapshot,
        });

        restante -= usar;
      }

      if (restante > 0) {
        throw new Error(`Saldo insuficiente na origem (faltam ${restante})`);
      }

      // cria um registro de transferência “sintético” para vínculo
      const created = await prisma.transferencia.create({
        data: {
          itemId: ag.itemId,
          estoqueOrigemId: ag.estoqueOrigemId!,
          estoqueDestinoId: ag.estoqueDestinoId,
          quantidade: ag.quantidade,
          usuarioId: ag.usuarioId,
        },
        select: { id: true },
      });

      await prisma.transferenciaAgendada.update({
        where: { id: ag.id },
        data: { status: "EXECUTED", transferenciaId: created.id },
      });

      // Telegram
      try {
        await TelegramService.sendTransferNotification({
          estoqueOrigemId: ag.estoqueOrigemId!,
          estoqueDestinoId: ag.estoqueDestinoId,
          itemNome: item.nome ?? `Item#${ag.itemId}`,
          quantidade: ag.quantidade,
          usuario: "system:auto",
          transferenciaId: created.id,
          quando: new Date(),
        });
      } catch {}

      return { ok: true, transferenciaId: created.id };
    }

    // === NONE (sem rastreio): transf simples ===
    await inv.transferir({
      itemId: ag.itemId,
      quantidade: ag.quantidade,
      origemId: ag.estoqueOrigemId!,
      destinoId: ag.estoqueDestinoId,
      referencia: { tabela: "transferenciaAgendada", id: ag.id },
      usuario: usuarioSnapshot,
    });

    const created = await prisma.transferencia.create({
      data: {
        itemId: ag.itemId,
        estoqueOrigemId: ag.estoqueOrigemId!,
        estoqueDestinoId: ag.estoqueDestinoId,
        quantidade: ag.quantidade,
        usuarioId: ag.usuarioId,
      },
      select: { id: true },
    });

    await prisma.transferenciaAgendada.update({
      where: { id: ag.id },
      data: { status: "EXECUTED", transferenciaId: created.id },
    });

    // Telegram
    try {
      await TelegramService.sendTransferNotification({
        estoqueOrigemId: ag.estoqueOrigemId!,
        estoqueDestinoId: ag.estoqueDestinoId,
        itemNome: item.nome ?? `Item#${ag.itemId}`,
        quantidade: ag.quantidade,
        usuario: "system:auto",
        transferenciaId: created.id,
        quando: new Date(),
      });
    } catch {}

    return { ok: true, transferenciaId: created.id };
  } catch (err: any) {
    await prisma.transferenciaAgendada.update({
      where: { id: agendamentoId },
      data: {
        tentativas: { increment: 1 },
        erroUltimaTentativa: String(err?.message ?? err).slice(0, 500),
      },
    });
    return { ok: false, reason: "EXEC_ERROR", error: err?.message ?? String(err) };
  }
}

export async function executarPendentes(limit = 50) {
  const pendentes = await prisma.transferenciaAgendada.findMany({
    where: { status: "PENDING" },
    orderBy: { executarEm: "asc" },
    take: limit,
    select: { id: true },
  });

  const resultados = [];
  for (const p of pendentes) {
    resultados.push({ id: p.id, ...(await executarAgendamento(p.id)) });
  }
  return { ok: true, count: resultados.length, resultados };
}

type AutoReposicaoResultado = {
  ok: boolean;
  acionado: boolean;
  reason?: string;
  detalhe?: string;

  estoqueDestinoId?: number;
  itemId?: number;

  agendamentosCriados?: number[];
  execResultados?: { id: number; ok: boolean; reason?: string; transferenciaId?: number }[];

  faltando?: number;
  necessario?: number;
};

export async function autoReposicaoAutomatica(
  estoqueDestinoId: number,
  itemId: number
): Promise<AutoReposicaoResultado> {
  const alvo = await prisma.estoqueItem.findUnique({
    where: {
      itemId_estoqueId: {
        itemId,
        estoqueId: estoqueDestinoId,
      },
    },
    select: {
      estoqueId: true,
      itemId: true,
      quantidade: true,
      minimo: true,
      maximo: true,
      autoAtivo: true,
    },
  });

  if (!alvo) {
    throw new Error("EstoqueItem não encontrado para esse estoque/item");
  }

  // Nome do item para mensagem no Telegram
  const item = await prisma.equipamento.findUnique({
    where: { id: itemId },
    select: { nome: true },
  });
  const itemNome = item?.nome ?? `Item#${itemId}`;

  // Se auto-reposição não estiver ativa, não faz nada
  if (!alvo.autoAtivo) {
    return {
      ok: true,
      acionado: false,
      reason: "AUTO_DESATIVADO",
    };
  }

  const qtdDestAtual = Number(alvo.quantidade ?? 0);
  const minimoDest = Number(alvo.minimo ?? 0) || 0;
  const maximoDest = alvo.maximo != null ? Number(alvo.maximo) : null;

  // Se não estiver abaixo do mínimo, não faz nada
  if (qtdDestAtual >= minimoDest) {
    return {
      ok: true,
      acionado: false,
      reason: "ESTOQUE_OK",
      detalhe: `Quantidade atual ${qtdDestAtual} >= mínimo ${minimoDest}`,
    };
  }

  // 2) Buscar outros estoques que têm esse item (fontes)
  const fontes = await prisma.estoqueItem.findMany({
    where: {
      itemId,
      estoqueId: { not: estoqueDestinoId },
    },
    select: {
      estoqueId: true,
      quantidade: true,
      minimo: true,
    },
    orderBy: {
      quantidade: "desc", // começa por quem tem mais saldo
    },
  });

  if (!fontes.length) {
    try {
      await TelegramService.sendLowStockAlert({
        estoqueId: estoqueDestinoId,
        itemId,
        itemNome,
        quantidade: qtdDestAtual,
        minimo: minimoDest,
      });
    } catch {}

    return {
      ok: false,
      acionado: false,
      reason: "SEM_OUTROS_ESTOQUES_COM_ITEM",
      necessario: minimoDest - qtdDestAtual,
    } as any;
  }

  // 3) Cálculo de equalização
  const totalTodos =
    qtdDestAtual +
    fontes.reduce((acc, f) => acc + Number(f.quantidade ?? 0), 0);

  const nEstoques = fontes.length + 1;
  const idealIgual = Math.floor(totalTodos / nEstoques);

  let alvoDest = Math.max(minimoDest, idealIgual);
  if (maximoDest != null && alvoDest > maximoDest) {
    alvoDest = maximoDest;
  }

  const alvoTotalNecessario = Math.max(0, alvoDest - qtdDestAtual);

  if (alvoTotalNecessario <= 0) {
    return {
      ok: true,
      acionado: false,
      reason: "ESTOQUE_JA_EQUILIBRADO",
      detalhe: `Quantidade atual ${qtdDestAtual} já é >= alvo ${alvoDest}`,
    };
  }

  const totalTransferivel = fontes.reduce((acc, f) => {
    const qtdFonte = Number(f.quantidade ?? 0);
    const minFonte = Number(f.minimo ?? 0);
    const disponivel = qtdFonte - minFonte;
    return disponivel > 0 ? acc + disponivel : acc;
  }, 0);

  if (totalTransferivel <= 0) {
    try {
      await TelegramService.sendLowStockAlert({
        estoqueId: estoqueDestinoId,
        itemId,
        itemNome,
        quantidade: qtdDestAtual,
        minimo: minimoDest,
      });
    } catch {}

    return {
      ok: false,
      acionado: false,
      reason: "SEM_SALDO_SUFICIENTE_NOS_OUTROS_ESTOQUES",
      faltando: alvoTotalNecessario,
    };
  }

  let restanteParaCobrir = Math.min(alvoTotalNecessario, totalTransferivel);
  const restanteInicial = restanteParaCobrir;

  const agendamentosCriados: number[] = [];
  const execResultados: {
    id: number;
    ok: boolean;
    reason?: string;
    transferenciaId?: number;
  }[] = [];

  for (const f of fontes) {
    if (restanteParaCobrir <= 0) break;

    const qtdFonte = Number(f.quantidade ?? 0);
    const minFonte = Number(f.minimo ?? 0);
    const disponivel = qtdFonte - minFonte;

    if (disponivel <= 0) continue;

    const transferir = Math.min(disponivel, restanteParaCobrir);
    if (transferir <= 0) continue;

    const ag = await prisma.transferenciaAgendada.create({
      data: {
        itemId,
        quantidade: transferir,
        estoqueOrigemId: f.estoqueId,
        estoqueDestinoId,
        usuarioId: SYSTEM_USER_ID,
        status: "PENDING",
        executarEm: new Date(),
        motivo: "AUTO_REPOSICAO",
        origemTipo: "AUTO",
      },
      select: { id: true, executarEm: true },
    });

    agendamentosCriados.push(ag.id);
    restanteParaCobrir -= transferir;

    try {
      await TelegramService.sendAgendamentoCreatedNotification({
        agendamentoId: ag.id,
        itemNome,
        quantidade: transferir,
        estoqueOrigemId: f.estoqueId,
        estoqueDestinoId,
        executarEm: ag.executarEm,
        usuario: "system:auto",
      });
    } catch {}
  }

  if (!agendamentosCriados.length) {
    try {
      await TelegramService.sendLowStockAlert({
        estoqueId: estoqueDestinoId,
        itemId,
        itemNome,
        quantidade: qtdDestAtual,
        minimo: minimoDest,
      });
    } catch {}

    return {
      ok: false,
      acionado: false,
      reason: "SEM_SALDO_SUFICIENTE_NOS_OUTROS_ESTOQUES",
      faltando: alvoTotalNecessario,
    };
  }

  for (const id of agendamentosCriados) {
    execResultados.push({ id, ...(await executarAgendamento(id)) });
  }

  const totalTransferido = restanteInicial - restanteParaCobrir;
  const faltando = Math.max(0, alvoTotalNecessario - totalTransferido);

  return {
    ok: true,
    acionado: true,
    estoqueDestinoId,
    itemId,
    agendamentosCriados,
    execResultados,
    faltando,
    detalhe: `Alvo de destino: ${alvoDest}, transferido: ${totalTransferido}, faltando: ${faltando}`,
  };
}
