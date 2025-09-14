import { getChannel } from '../queue/rabbit';
import { prisma } from '../lib/prisma';
import { ensureRetryQueue, nextDelayMs } from '../queue/retry';

type ConsumeMessage = import('amqplib').ConsumeMessage;

const MAX_ATTEMPTS = 5;

export async function startConsumer() {
  const ch = await getChannel();

  await ch.consume('transfer.execute', async (msg: ConsumeMessage | null) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await processar(payload);
      ch.ack(msg);
    } catch (e) {
      const headers = (msg.properties.headers ?? {}) as any;
      const attempt = Number(headers['x-attempt'] ?? 0) + 1;

      if (attempt >= MAX_ATTEMPTS) {
        ch.nack(msg, false, false);
        return;
      }

      const delay = nextDelayMs(attempt);
      const retryQueue = await ensureRetryQueue(ch, delay);

      ch.sendToQueue(retryQueue, msg.content, {
        contentType: 'application/json',
        deliveryMode: 2,
        headers: { ...headers, 'x-attempt': attempt },
        messageId: msg.properties.messageId,
      });
      ch.ack(msg);
    }
  }, { noAck: false });
}

async function processar(p: any) {
  const { jobId, itemId, estoqueOrigemId, estoqueDestinoId, quantidade, usuarioId } = p;

  const ag = await prisma.transferenciaAgendada.findUnique({ where: { id: jobId } });
  if (!ag) return;
  if (ag.status === 'CANCELED' || ag.status === 'EXECUTED') return;

  await prisma.$transaction(async (tx) => {
    if (estoqueOrigemId === estoqueDestinoId) throw new Error('Estoques iguais');
    if (quantidade <= 0) throw new Error('Quantidade inválida');

    const updated = await tx.estoqueItem.updateMany({
      where: { itemId, estoqueId: estoqueOrigemId, quantidade: { gte: quantidade } },
      data: { quantidade: { decrement: quantidade } },
    });
    if (updated.count === 0) throw new Error('Quantidade insuficiente no estoque de origem');

    await tx.estoqueItem.upsert({
      where: { itemId_estoqueId: { itemId, estoqueId: estoqueDestinoId } },
      update: { quantidade: { increment: quantidade } },
      create: { itemId, estoqueId: estoqueDestinoId, quantidade },
    });

    const transferencia = await tx.transferencia.create({
      data: { itemId, estoqueOrigemId, estoqueDestinoId, quantidade, usuarioId },
    });

    await tx.transferenciaAgendada.update({
      where: { id: jobId },
      data: { status: 'EXECUTED', transferenciaId: transferencia.id },
    });
  }, { isolationLevel: 'Serializable' });
}
