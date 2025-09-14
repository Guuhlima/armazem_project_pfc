// src/queue/rabbit.ts
import amqp from 'amqplib';

type Channel = import('amqplib').Channel;
type Connection = import('amqplib').Connection;

let conn: Connection | null = null;
let ch: Channel | null = null;

export async function getChannel(): Promise<Channel> {
  if (ch) return ch;

  const url = process.env.AMQP_URL!;
  conn = await amqp.connect(url);
  ch = await conn.createChannel();

  await ch.assertQueue('transfer.execute.dlq', { durable: true });
  await ch.assertQueue('transfer.execute', {
    durable: true,
    deadLetterExchange: '',
    deadLetterRoutingKey: 'transfer.execute.dlq',
  });
  await ch.prefetch(Number(process.env.AMQP_PREFETCH ?? 20));

  return ch;
}
