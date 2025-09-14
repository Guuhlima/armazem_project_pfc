// src/queue/rabbit.ts
import amqp from 'amqplib';

type Channel = import('amqplib').Channel;
type Connection = import('amqplib').Connection;

let conn: Connection | null = null;
let ch: Channel | null = null;
let connecting: Promise<Channel> | null = null;

const AMQP_URL = process.env.AMQP_URL || 'amqp://guest:guest@localhost:5672';
const PREFETCH = Number(process.env.AMQP_PREFETCH ?? 20);

async function open(): Promise<Channel> {
  if (ch) return ch;
  if (connecting) return connecting;

  connecting = (async () => {
    const urlWithHb = AMQP_URL.includes('?') ? `${AMQP_URL}&heartbeat=30` : `${AMQP_URL}?heartbeat=30`;
    conn = await amqp.connect(urlWithHb);

    conn.on('close', (err) => {
      console.warn('[amqp] connection closed', err?.message);
      ch = null;
      conn = null;
      // tenta reabrir depois de um tempo
      setTimeout(() => { connecting = null; open().catch(() => {}); }, 2000);
    });

    conn.on('error', (err) => {
      console.error('[amqp] connection error', err?.message);
    });

    const channel = await conn.createChannel();

    channel.on('close', () => {
      console.warn('[amqp] channel closed');
      if (conn) {
        // tenta reabrir canal na mesma conexão
        ch = null;
        connecting = null;
        open().catch(() => {});
      }
    });

    await channel.assertQueue('transfer.execute.dlq', { durable: true });
    await channel.assertQueue('transfer.execute', {
      durable: true,
      deadLetterExchange: '',
      deadLetterRoutingKey: 'transfer.execute.dlq',
    });
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
