import amqp from 'amqplib';

type Channel = import('amqplib').Channel;
type Connection = import('amqplib').Connection;
type Message = import('amqplib').Message;

let conn: Connection | null = null;
let ch: Channel | null = null;
let connecting: Promise<Channel> | null = null;

const AMQP_URL = process.env.AMQP_URL || 'amqp://guest:guest@localhost:5672';
const PREFETCH = Number(process.env.AMQP_PREFETCH ?? 20);

const QUEUES = [
  { key: 'transfer.execute', dlq: 'transfer.execute.dlq' },
  { key: 'replenishment.requested', dlq: 'replenishment.requested.dlq' },
];

async function assertQueues(channel: Channel) {
  for (const q of QUEUES) {
    await channel.assertQueue(q.dlq, { durable: true });
    await channel.assertQueue(q.key, {
      durable: true,
      deadLetterExchange: '',
      deadLetterRoutingKey: q.dlq,
    });
  }
}

async function open(): Promise<Channel> {
  if (ch) return ch;
  if (connecting) return connecting;

  connecting = (async () => {
    const urlWithHb = AMQP_URL.includes('?')
      ? `${AMQP_URL}&heartbeat=30`
      : `${AMQP_URL}?heartbeat=30`;

    conn = await amqp.connect(urlWithHb);

    conn.on('close', (err) => {
      console.warn('[amqp] connection closed', err?.message);
      ch = null;
      conn = null;
      setTimeout(() => { connecting = null; open().catch(() => {}); }, 2000);
    });

    conn.on('error', (err) => {
      console.error('[amqp] connection error', err?.message);
    });

    const channel = await conn.createChannel();

    channel.on('close', () => {
      console.warn('[amqp] channel closed');
      if (conn) {
        ch = null;
        connecting = null;
        open().catch(() => {});
      }
    });

    await assertQueues(channel);
    await channel.prefetch(PREFETCH);

    ch = channel;
    return channel;
  })();

  try {
    const channel = await connecting;
    connecting = null;
    return channel;
  } catch (e) {
    connecting = null;
    throw e;
  }
}

export async function getChannel(): Promise<Channel> {
  return open();
}

export async function publish(queue: string, payload: any, options?: {
  headers?: Record<string, any>;
  expiration?: string | number;
}) {
  const channel = await getChannel();
  const qDef = QUEUES.find(q => q.key === queue);
  if (!qDef) {
    await channel.assertQueue(queue, { durable: true });
  }

  const body = Buffer.from(JSON.stringify(payload));
  const ok = channel.sendToQueue(queue, body, {
    persistent: true,
    contentType: 'application/json',
    headers: options?.headers ?? {},
    expiration: options?.expiration,
  });
  if (!ok) {
    await new Promise<void>(resolve => channel.once('drain', () => resolve()));
  }
}

export async function consume<T = any>(
  queue: string,
  handler: (msg: T, raw: Message, channel: Channel) => Promise<void>,
  opts?: { maxRetries?: number; onError?: (e: any, msg?: T) => void }
) {
  const channel = await getChannel();
  const qDef = QUEUES.find(q => q.key === queue);
  if (!qDef) {
    await channel.assertQueue(queue, { durable: true });
  }

  const maxRetries = opts?.maxRetries ?? 5;

  await channel.consume(queue, async (raw) => {
    if (!raw) return;

    let parsed: any = null;
    try {
      const content = raw.content?.toString() || '{}';
      parsed = JSON.parse(content);
    } catch {
      channel.nack(raw, false, false);
      return;
    }

    try {
      await handler(parsed as T, raw, channel);
      channel.ack(raw);
    } catch (e) {
      try { opts?.onError?.(e, parsed); } catch {}
      const prev = Number(raw.properties.headers?.['x-retries'] ?? 0);
      const next = prev + 1;

      if (next > maxRetries) {
        channel.nack(raw, false, false);
        return;
      }

      channel.ack(raw);
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(parsed)), {
        persistent: true,
        contentType: 'application/json',
        headers: { ...(raw.properties.headers || {}), 'x-retries': next },
      });
    }
  }, { noAck: false });
}

export async function ensureQueueWithDlq(key: string, dlq?: string) {
  const channel = await getChannel();
  const dlqName = dlq ?? `${key}.dlq`;
  await channel.assertQueue(dlqName, { durable: true });
  await channel.assertQueue(key, {
    durable: true,
    deadLetterExchange: '',
    deadLetterRoutingKey: dlqName,
  });
}