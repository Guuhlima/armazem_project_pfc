import { prisma } from "../lib/prisma";
import { TelegramService } from "./telegram.service";
import type { TelegramResult } from "./telegram.service";
import { publish } from "../queue/rabbit";

import crypto from "crypto";

// ✅ flag opcional pra testar sem fila (cai no catch e cria local)
const FORCE_LOCAL_FALLBACK = process.env.FORCE_LOCAL_FALLBACK === "1";

// ✅ throttle à prova de NaN
const TELEGRAM_THROTTLE_MINUTES = (() => {
  const n = Number(process.env.TELEGRAM_THROTTLE_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : 60;
})();

const SYSTEM_USER_ID = Number(process.env.SYSTEM_USER_ID ?? 1);

type AlertBase = {
  quantidade: number;
  minimo: number;
  telegram?: TelegramResult;
};

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
  const ruptura = ei.quantidade <= 0; // ✅ tolera negativos
  const tipoAtual: "RUPTURA" | "ABAIXO_MINIMO" = ruptura ? "RUPTURA" : "ABAIXO_MINIMO";

  if (ei.autoAtivo && abaixoMinimo) {
    try {
      const jaTemAuto = await prisma.transferenciaAgendada.findFirst({
        where: {
          itemId,
          estoqueDestinoId: estoqueId,
          origemTipo: "AUTO",
          status: "PENDING", // ✅ bloqueia só se estiver pendente
        },
        select: { id: true },
      });

      if (!jaTemAuto) {
        await publish("replenishment.requested", {
          estoqueDestinoId: estoqueId,
          itemId,
          motivo: "ABAIXO_MINIMO",
          regra: {
            maximo: ei.maximo ?? null,
            multiplo: ei.multiplo ?? null,
            origemPreferidaId: ei.origemPreferidaId ?? null,
            leadTimeDias: ei.leadTimeDias ?? null,
          },
          ts: Date.now(),
        });
      }

      // ✅ para testar sem consumer da fila: força cair no catch
      if (FORCE_LOCAL_FALLBACK) {
        throw new Error("FORCED_FALLBACK_FOR_TEST");
      }
    } catch (e) {
      const alvo = (ei.maximo ?? ei.minimo) || ei.minimo;
      let qtd = Math.max(0, alvo - ei.quantidade);
      if (ei.multiplo && ei.multiplo > 1) {
        qtd = Math.ceil(qtd / ei.multiplo) * ei.multiplo;
      }

      if (qtd > 0) {
        const origemCands = await prisma.estoqueItem.findMany({
          where: {
            itemId,
            estoqueId: { not: estoqueId },
            quantidade: { gt: 0 },
          },
          select: { estoqueId: true, quantidade: true, minimo: true },
        });

        if (!origemCands.length) {
          // (opcional) dispara compra/produção externa
          await publish("procurement.requested", {
            itemId,
            estoqueDestinoId: estoqueId,
            motivo: "SEM_ORIGEM_INTERNA",
            faltante: Math.max(0, ((ei.maximo ?? ei.minimo) || ei.minimo) - ei.quantidade),
            multiplo: ei.multiplo ?? null,
            ts: Date.now(),
          }).catch(() => {});

          // (opcional) alerta explícito
          try {
            await TelegramService.sendLowStockAlert({
              estoqueId,
              itemId,
              itemNome,
              quantidade: ei.quantidade,
              minimo,
            });
          } catch {}

          return {
            kind: "THROTTLED", // pode ser "NONE" se preferir
            tipo: tipoAtual,
            quantidade: ei.quantidade,
            minimo,
          };
        }

        // ✅ preferida só se for DIFERENTE do destino
        const preferida =
          ei.origemPreferidaId && ei.origemPreferidaId !== estoqueId
            ? origemCands.find(
                (o) => o.estoqueId === ei.origemPreferidaId && o.quantidade > 0
              )
            : undefined;

        const origem =
          preferida ??
          origemCands.sort((a, b) => b.quantidade - a.quantidade)[0];

        if (origem) {
          // limita pela disponibilidade do doador
          qtd = Math.min(qtd, origem.quantidade);

          // ✅ reaplica múltiplo após limitar
          if (ei.multiplo && ei.multiplo > 1) {
            qtd = Math.floor(qtd / ei.multiplo) * ei.multiplo;
          }

          if (qtd <= 0) {
            return {
              kind: "THROTTLED",
              tipo: tipoAtual,
              quantidade: ei.quantidade,
              minimo,
            };
          }

          const dedupKey = crypto
            .createHash("sha1")
            .update(`${itemId}:${origem.estoqueId}->${estoqueId}:${alvo}:ABAIXO_MINIMO`)
            .digest("hex");

          const exists = await prisma.transferenciaAgendada
            .findUnique({ where: { dedupKey } })
            .catch(() => null);

          if (!exists) {
            const ag = await prisma.transferenciaAgendada.create({
              data: {
                itemId,
                estoqueOrigemId: origem.estoqueId,
                estoqueDestinoId: estoqueId,
                quantidade: qtd,
                usuarioId: SYSTEM_USER_ID,
                executarEm: new Date(), // (opcional) considerar leadTimeDias aqui
                status: "PENDING",
                origemTipo: "AUTO",
                motivo: "ABAIXO_MINIMO",
                dedupKey,
              } as any,
            });

            try {
              await TelegramService.sendAgendamentoCreatedNotification({
                agendamentoId: ag.id,
                itemNome,
                quantidade: ag.quantidade,
                estoqueOrigemId: ag.estoqueOrigemId,
                estoqueDestinoId: ag.estoqueDestinoId,
                executarEm: ag.executarEm,
                usuario: "system:auto (fallback)",
              });
            } catch {}
          }
        }
      }
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
      prisma.alertaEstoque.create({
        data: { estoqueId, itemId, tipo: tipoAtual, mensagem: msg },
      }),
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
      ? await TelegramService.sendRupturaAlert({
          estoqueId,
          itemId,
          itemNome,
          quantidade: ei.quantidade,
          minimo,
        })
      : await TelegramService.sendLowStockAlert({
          estoqueId,
          itemId,
          itemNome,
          quantidade: ei.quantidade,
          minimo,
        });

    return {
      kind: "OPEN",
      tipo: tipoAtual,
      quantidade: ei.quantidade,
      minimo,
      telegram,
    };
  }

  if (abaixoMinimo && ei.alertaativo) {
    if (!alertaAberto) {
      const msg = ruptura
        ? "Ruptura de estoque (quantidade = 0)."
        : `Quantidade (${ei.quantidade}) abaixo do mínimo (${minimo}).`;

      await prisma.$transaction([
        prisma.alertaEstoque.create({
          data: { estoqueId, itemId, tipo: tipoAtual, mensagem: msg },
        }),
        prisma.estoqueItem.update({
          where: { itemId_estoqueId: { itemId, estoqueId } },
          data: { alertaativo: true },
        }),
      ]);

      const telegram: TelegramResult = ruptura
        ? await TelegramService.sendRupturaAlert({
            estoqueId,
            itemId,
            itemNome,
            quantidade: ei.quantidade,
            minimo,
          })
        : await TelegramService.sendLowStockAlert({
            estoqueId,
            itemId,
            itemNome,
            quantidade: ei.quantidade,
            minimo,
          });

      return {
        kind: "OPEN",
        tipo: tipoAtual,
        quantidade: ei.quantidade,
        minimo,
        telegram,
      };
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
          ? await TelegramService.sendRupturaAlert({
              estoqueId,
              itemId,
              itemNome,
              quantidade: ei.quantidade,
              minimo,
            })
          : await TelegramService.sendLowStockAlert({
              estoqueId,
              itemId,
              itemNome,
              quantidade: ei.quantidade,
              minimo,
            });
    }

    return {
      kind: "THROTTLED",
      tipo: tipoAtual,
      quantidade: ei.quantidade,
      minimo,
      telegram,
    };
  }

  if (!abaixoMinimo && ei.alertaativo) {
    await prisma.$transaction([
      prisma.alertaEstoque.updateMany({
        where: {
          estoqueId,
          itemId,
          resolvido: false,
          tipo: { in: ["ABAIXO_MINIMO", "RUPTURA"] },
        },
        data: { resolvido: true, resolvedAt: new Date() },
      }),
      prisma.estoqueItem.update({
        where: { itemId_estoqueId: { itemId, estoqueId } },
        data: { alertaativo: false },
      }),
    ]);

    const telegram = await TelegramService.sendLowStockResolved({
      estoqueId,
      itemId,
      itemNome,
      quantidade: ei.quantidade,
      minimo,
    });

    return { kind: "RESOLVED", quantidade: ei.quantidade, minimo, telegram };
  }

  return { kind: "NONE" };
}