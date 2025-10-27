// src/tests/utils/createReply.ts
import { FastifyReply } from 'fastify';

export type TestReply<T = any> =
  Partial<FastifyReply> & { payload?: T; statusCode?: number };

export function createReply<T = any>(): TestReply<T> {
  const r: any = {
    statusCode: 200,
    code(code: number) { this.statusCode = code; return this; },
    status(code: number) { this.statusCode = code; return this; },
    header() { return this; },
    type() { return this; },
    send(payload: T) { this.payload = payload; return this; },
  };
  return r as TestReply<T>;
}
