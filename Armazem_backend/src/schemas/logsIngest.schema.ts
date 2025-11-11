import { Type } from '@sinclair/typebox';

export const IngestEvent = Type.Object({
  type: Type.Union([
    Type.Literal('ACCESS'),
    Type.Literal('INVENTORY'),
    Type.Literal('BOT'),
  ]),
  action: Type.Optional(Type.String()),
  success: Type.Optional(Type.Boolean()),
  route: Type.Optional(Type.String()),
  message: Type.Optional(Type.String()),
  errorCode: Type.Optional(Type.String()),
  errorMessage: Type.Optional(Type.String()),
  createdAt: Type.Optional(Type.String()), // ISO opcional
  actorUserId: Type.Optional(Type.Number()),
  actorName: Type.Optional(Type.String()),
  itemId: Type.Optional(Type.Number()),
  estoqueId: Type.Optional(Type.Number()),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
});

export const IngestBody = Type.Object({
  events: Type.Array(IngestEvent, { minItems: 1, maxItems: 1000 }),
});
