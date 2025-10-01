import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export async function checarLimitesEGerenciarAlertas(estoqueId: number, itemId: number) {
  const ei = await prisma.estoqueItem.findUnique({
    where: { itemId_estoqueId: { itemId, estoqueId } },
    select: { quantidade: true, minimo: true, alertaAtivo: true },
  });

  if (!ei) return;

  const abaixoMinimo = ei.quantidade <= ei.minimo;
  const ruptura = ei.quantidade === 0;

  if (abaixoMinimo && !ei.alertaAtivo) {
    const msg = ruptura
      ? 'Ruptura de estoque (quantidade = 0).'
      : `Quantidade (${ei.quantidade}) abaixo do mínimo (${ei.minimo}).`;

    await prisma.$transaction([
      prisma.alertaEstoque.create({
        data: {
          estoqueId,
          itemId,
          tipo: ruptura ? 'RUPTURA' : 'ABAIXO_MINIMO',
          mensagem: msg,
        },
      }),
      prisma.estoqueItem.update({
        where: { itemId_estoqueId: { itemId, estoqueId } },
        data: { alertaAtivo: true },
      }),
    ]);
  }

  if (!abaixoMinimo && ei.alertaAtivo) {
    await prisma.$transaction([
      prisma.alertaEstoque.updateMany({
        where: { estoqueId, itemId, resolvido: false },
        data: { resolvido: true, resolvedAt: new Date() },
      }),
      prisma.estoqueItem.update({
        where: { itemId_estoqueId: { itemId, estoqueId } },
        data: { alertaAtivo: false },
      }),
    ]);
  }
}
