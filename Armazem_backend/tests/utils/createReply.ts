import { FastifyReply } from 'fastify';

export function createReply(): FastifyReply {
  const reply = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as FastifyReply;

  return reply;
}
