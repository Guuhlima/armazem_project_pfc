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

  try {
    // === Se for SERIAL, não dá pra automatizar sem serial específico ===
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

    // === Se for LOTE: quebrar por FEFO (menor validade primeiro) ===
    if (item.rastreioTipo === RastreioTipo.LOTE) {
      let restante = ag.quantidade;
      const picks = await sugerirFEFO(ag.itemId, ag.estoqueOrigemId!, 999);

      if (!picks?.length) throw new Error("Sem saldo por lote na origem");

      // executa em transação: vários transf por lote até cobrir 'quantidade'
      await prisma.$transaction(async () => {
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
          });

          restante -= usar;
        }

        if (restante > 0) {
          throw new Error(`Saldo insuficiente na origem (faltam ${restante})`);
        }
      });

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

export async function autoReposicaoAutomatica(estoqueDestinoId: number, itemId: number) {
  // 1) Pega o EstoqueItem alvo (onde está baixo) usando a UNIQUE correta
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

  // Se auto-reposição não estiver ativa, não faz nada
  if (!alvo.autoAtivo) {
    return {
      ok: true,
      acionado: false,
      reason: "AUTO_DESATIVADO",
    };
  }

  const qtdAtual = Number(alvo.quantidade ?? 0);
  const minimo = Number(alvo.minimo ?? 0);

  // Se não estiver abaixo do mínimo, não faz nada
  if (qtdAtual >= minimo) {
    return {
      ok: true,
      acionado: false,
      reason: "ESTOQUE_OK",
      detalhe: `Quantidade atual ${qtdAtual} >= mínimo ${minimo}`,
    };
  }

  // Quanto precisa para chegar no mínimo
  let necessario = minimo - qtdAtual;

  // 2) Buscar outros estoques que têm esse item
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
    return {
      ok: false,
      acionado: false,
      reason: "SEM_OUTROS_ESTOQUES_COM_ITEM",
      necessario,
    };
  }

  const agendamentosCriados: number[] = [];

  // 3) Para cada estoque fonte, ver quanto dá pra tirar acima do mínimo
  for (const f of fontes) {
    if (necessario <= 0) break;

    const qtdFonte = Number(f.quantidade ?? 0);
    const minFonte = Number(f.minimo ?? 0);

    const disponivel = qtdFonte - minFonte; // só o que está acima do mínimo da origem
    if (disponivel <= 0) continue;

    const transferir = Math.min(disponivel, necessario);
    if (transferir <= 0) continue;

    // cria um agendamento de transferência (origem -> destino)
    const ag = await prisma.transferenciaAgendada.create({
      data: {
        itemId,
        quantidade: transferir,
        estoqueOrigemId: f.estoqueId,
        estoqueDestinoId,
        usuarioId: SYSTEM_USER_ID,
        status: "PENDING",
        executarEm: new Date(), // executa já
        motivo: "AUTO_REPOSICAO",
        origemTipo: "AUTO",
      },
      select: { id: true },
    });

    agendamentosCriados.push(ag.id);
    necessario -= transferir;
  }

  if (!agendamentosCriados.length) {
    return {
      ok: false,
      acionado: false,
      reason: "SEM_SALDO_SUFICIENTE_NOS_OUTROS_ESTOQUES",
      faltando: necessario,
    };
  }

  // 4) Executa os agendamentos criados usando sua lógica de transferência automática
  const execResultados = [];
  for (const id of agendamentosCriados) {
    execResultados.push({ id, ...(await executarAgendamento(id)) });
  }

  return {
    ok: true,
    acionado: true,
    estoqueDestinoId,
    itemId,
    agendamentosCriados,
    execResultados,
    faltando: Math.max(necessario, 0),
  };
}