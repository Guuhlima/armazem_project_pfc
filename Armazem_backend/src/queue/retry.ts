import { Channel } from 'amqplib';

export function nextDelayMs(attempt: number) {
  const base = Number(process.env.RETRY_INITIAL_MS ?? 10_000);
  const max  = Number(process.env.RETRY_MAX_MS ?? 600_000);
  const exp = Math.min(base * 2 ** (attempt - 1), max);
  const jitter = Math.floor(Math.random() * Math.min(exp * 0.1, 5_000));
  return exp + jitter;
}

const retryQueues = new Map<number, string>();

export async function ensureRetryQueue(ch: Channel, ttlMs: number): Promise<string> {
  if (retryQueues.has(ttlMs)) return retryQueues.get(ttlMs)!;

  const name = `transfer.execute.retry.${ttlMs}`;
  await ch.assertQueue(name, {
    durable: true,
    arguments: {
      'x-message-ttl': ttlMs,
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': 'transfer.execute',
    },
  });
  retryQueues.set(ttlMs, name);
  return name;
}
