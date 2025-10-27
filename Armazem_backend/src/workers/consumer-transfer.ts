  import { getChannel } from '../queue/rabbit';
  import { prisma } from '../lib/prisma';
  import { ensureRetryQueue, nextDelayMs } from '../queue/retry';
  import { TelegramService } from 'service/telegram.service';

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

  const ag = await prisma.transferenciaAgendada.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, transferenciaId: true, itemId: true }
  });
  if (!ag) return;

  // evita reprocessar/cancelados
  if (ag.status === 'CANCELED' || ag.status === 'EXECUTED') return;
  // se já tem transferencia ligada, considera concluído
  if (ag.transferenciaId) return;

  // nome do item para mensagens
  const item = await prisma.equipamento.findUnique({
    where: { id: itemId },
    select: { nome: true },
  });
  const itemNome = (item?.nome ?? '').trim() || `Item#${itemId}`;

  // 1) marca início (SENT) — não usa método Telegram inexistente
  if (ag.status !== 'SENT') {
    await prisma.transferenciaAgendada.update({
      where: { id: jobId },
      data: { status: 'SENT', tentativas: { increment: 1 }, erroUltimaTentativa: null },
    }).catch(() => {});
    // Se quiser notificar início: crie um método no TelegramService,
    // ex.: TelegramService.sendAgendamentoStartNotification(...).
    // Por ora, seguimos sem notificar aqui para evitar o erro de método inexistente.
  }

  try {
    // 2) executa a transferência (tudo na transação)
    const { id: transfId, dataTransferencia } = await prisma.$transaction(async (tx) => {
      if (estoqueOrigemId === estoqueDestinoId) throw new Error('Estoques iguais');
      if (!Number.isFinite(quantidade) || quantidade <= 0) throw new Error('Quantidade inválida');

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

      const t = await tx.transferencia.create({
        data: { itemId, estoqueOrigemId, estoqueDestinoId, quantidade, usuarioId },
        select: { id: true, dataTransferencia: true },
      });

      return t;
    }, { isolationLevel: 'Serializable' });

    // 3) marca EXECUTED + notifica sucesso (usa método que existe)
    await prisma.transferenciaAgendada.update({
      where: { id: jobId },
      data: { status: 'EXECUTED', transferenciaId: transfId },
    });

    try {
      await TelegramService.sendAgendamentoExecutedNotification({
        agendamentoId: jobId,
        transferenciaId: transfId,
        quando: dataTransferencia ?? new Date(),
        itemNome,
        quantidade,
        estoqueOrigemId,
        estoqueDestinoId,
      });
    } catch {}
  } catch (e: any) {
    // 4) marca FAILED + (opcional) notifica erro (crie método no TelegramService se quiser)
    await prisma.transferenciaAgendada.update({
      where: { id: jobId },
      data: { status: 'FAILED', erroUltimaTentativa: e?.message ?? 'erro' },
    }).catch(() => {});
    // Opcional: se tiver um método pronto, chame aqui.
    // try { await TelegramService.sendAgendamentoFailedNotification({...}); } catch {}
    throw e; // deixa o caller reenfileirar (retry)
  }
}
