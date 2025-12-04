import { prisma } from "../lib/prisma";
import { TelegramService } from "./telegram.service";
import type { TelegramResult } from "./telegram.service";
import { autoReposicaoAutomatica } from "./agendamento.service";

const TELEGRAM_THROTTLE_MINUTES = (() => {
  const n = Number(process.env.TELEGRAM_THROTTLE_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : 60;
})();

type AlertBase = { quantidade: number; minimo: number; telegram?: TelegramResult };
type NoneReason = "NO_DONOR" | "NO_QTY" | "DUPLICATE" | "NOT_BELOW_MIN";

export type AlertEvent =
  | ({ kind: "OPEN"; tipo: "ABAIXO_MINIMO" | "RUPTURA" } & AlertBase)
  | ({ kind: "THROTTLED"; tipo: "ABAIXO_MINIMO" | "RUPTURA" } & AlertBase)
  | ({ kind: "RESOLVED" } & AlertBase)
  | { kind: "NONE"; reason?: NoneReason };

export async function checarLimitesEGerenciarAlertas(
  estoqueId: number,
  itemId: number
): Promise<AlertEvent> {
  const ei = await prisma.estoqueItem.findUnique({
    where: { itemId_estoqueId: { itemId, estoqueId } },
    select: {
      quantidade: true,
      minimo: true,
      alertaativo: true,
      autoAtivo: true,
      maximo: true,
      multiplo: true,
      origemPreferidaId: true,
      leadTimeDias: true,
      item: { select: { nome: true } },
    },
  });
  if (!ei) return { kind: "NONE" };

  const itemNome = (ei.item?.nome ?? "").trim() || `Item #${itemId}`;
  const minimo = ei.minimo ?? 0;
  const abaixoMinimo = ei.quantidade <= minimo;
  const ruptura = ei.quantidade <= 0;
  const tipoAtual: "RUPTURA" | "ABAIXO_MINIMO" = ruptura ? "RUPTURA" : "ABAIXO_MINIMO";

  if (ei.autoAtivo && abaixoMinimo) {
    try {
      await autoReposicaoAutomatica(estoqueId, itemId);
    } catch (e) {
    }
  }

  const alertaAberto = await prisma.alertaEstoque.findFirst({
    where: { estoqueId, itemId, resolvido: false, tipo: tipoAtual },
    select: { id: true, ultimoEnvioAt: true, tipo: true },
  });

  if (abaixoMinimo && !ei.alertaativo) {
    const msg = ruptura
      ? "Ruptura de estoque (quantidade = 0)."
      : `Quantidade (${ei.quantidade}) abaixo do mínimo (${minimo}).`;

    await prisma.$transaction([
      prisma.alertaEstoque.create({ data: { estoqueId, itemId, tipo: tipoAtual, mensagem: msg } }),
      prisma.estoqueItem.update({
        where: { itemId_estoqueId: { itemId, estoqueId } },
        data: { alertaativo: true },
      }),
    ]);

    const agora = new Date();
    await prisma.alertaEstoque.updateMany({
      where: { estoqueId, itemId, resolvido: false, tipo: tipoAtual },
      data: { ultimoEnvioAt: agora },
    });

    const telegram: TelegramResult = ruptura
      ? await TelegramService.sendRupturaAlert({ estoqueId, itemId, itemNome, quantidade: ei.quantidade, minimo })
      : await TelegramService.sendLowStockAlert({ estoqueId, itemId, itemNome, quantidade: ei.quantidade, minimo });

    return { kind: "OPEN", tipo: tipoAtual, quantidade: ei.quantidade, minimo, telegram };
  }

  if (abaixoMinimo && ei.alertaativo) {
    if (!alertaAberto) {
      const msg = ruptura
        ? "Ruptura de estoque (quantidade = 0)."
        : `Quantidade (${ei.quantidade}) abaixo do mínimo (${minimo}).`;

      await prisma.$transaction([
        prisma.alertaEstoque.create({ data: { estoqueId, itemId, tipo: tipoAtual, mensagem: msg } }),
        prisma.estoqueItem.update({
          where: { itemId_estoqueId: { itemId, estoqueId } },
          data: { alertaativo: true },
        }),
      ]);

      const telegram: TelegramResult = ruptura
        ? await TelegramService.sendRupturaAlert({ estoqueId, itemId, itemNome, quantidade: ei.quantidade, minimo })
        : await TelegramService.sendLowStockAlert({ estoqueId, itemId, itemNome, quantidade: ei.quantidade, minimo });

      return { kind: "OPEN", tipo: tipoAtual, quantidade: ei.quantidade, minimo, telegram };
    }

    const agora = new Date();
    const ultimo = alertaAberto.ultimoEnvioAt?.getTime?.() ?? 0;
    const mins = (agora.getTime() - ultimo) / 60000;
    const podeEnviar = mins > TELEGRAM_THROTTLE_MINUTES;

    let telegram: TelegramResult | undefined;
    if (podeEnviar) {
      await prisma.alertaEstoque.updateMany({
        where: { estoqueId, itemId, resolvido: false, tipo: alertaAberto.tipo },
        data: { ultimoEnvioAt: agora },
      });

      telegram =
        alertaAberto.tipo === "RUPTURA"
          ? await TelegramService.sendRupturaAlert({ estoqueId, itemId, itemNome, quantidade: ei.quantidade, minimo })
          : await TelegramService.sendLowStockAlert({ estoqueId, itemId, itemNome, quantidade: ei.quantidade, minimo });
    }

    return { kind: "THROTTLED", tipo: tipoAtual, quantidade: ei.quantidade, minimo, telegram };
  }

  if (!abaixoMinimo && ei.alertaativo) {
    await prisma.$transaction([
      prisma.alertaEstoque.updateMany({
        where: { estoqueId, itemId, resolvido: false, tipo: { in: ["ABAIXO_MINIMO", "RUPTURA"] } },
        data: { resolvido: true, resolvedAt: new Date() },
      }),
      prisma.estoqueItem.update({
        where: { itemId_estoqueId: { itemId, estoqueId } },
        data: { alertaativo: false },
      }),
    ]);

    const telegram = await TelegramService.sendLowStockResolved({
      estoqueId, itemId, itemNome, quantidade: ei.quantidade, minimo,
    });

    return { kind: "RESOLVED", quantidade: ei.quantidade, minimo, telegram };
  }

  return { kind: "NONE" };
}

