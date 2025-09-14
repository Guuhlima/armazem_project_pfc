import { prisma } from '../lib/prisma';
import { getChannel } from '../queue/rabbit';

const TICK_MS = 60_000;

export async function schedulerTick() {
  const now = new Date();
  const janela = new Date(now.getTime() + TICK_MS);

  const pendentes = await prisma.transferenciaAgendada.findMany({
    where: { status: 'PENDING', executarEm: { lte: janela } },
    orderBy: { executarEm: 'asc' },
    take: 100,
  });
  if (!pendentes.length) return;

  const ch = await getChannel();

  for (const j of pendentes) {
    await prisma.transferenciaAgendada.update({
      where: { id: j.id },
      data: { status: 'SENT' },
    });

    const payload = {
      jobId: j.id,
      itemId: j.itemId,
      estoqueOrigemId: j.estoqueOrigemId,
      estoqueDestinoId: j.estoqueDestinoId,
      quantidade: j.quantidade,
      usuarioId: j.usuarioId,
    };

    ch.sendToQueue('transfer.execute', Buffer.from(JSON.stringify(payload)), {
      contentType: 'application/json',
      deliveryMode: 2,
      messageId: `ag-${j.id}`,
    });
  }
}

export function startSchedulerLoop() {
  setInterval(() => {
    schedulerTick().catch((e) => console.error('schedulerTick error:', e));
  }, TICK_MS);
}
