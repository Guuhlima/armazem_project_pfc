import { Type } from '@sinclair/typebox'

const LogTypeQS = Type.Union([
  Type.Literal('ACCESS'),
  Type.Literal('INVENTORY'),
  Type.Literal('BOT'),
])

const LogActionQS = Type.Union([
  Type.Literal('LOGIN'), Type.Literal('LOGOUT'), Type.Literal('REQUEST'),
  Type.Literal('CREATE'), Type.Literal('UPDATE'), Type.Literal('DELETE'),
  Type.Literal('MOVE'), Type.Literal('TRANSFER'),
  Type.Literal('MESSAGE_SENT'), Type.Literal('MESSAGE_FAILED'),
])

export const TimeSeriesQuery = Type.Object({
  inicio: Type.String(),
  fim: Type.String(),
  granularity: Type.Union([ Type.Literal('hour'), Type.Literal('day'), Type.Literal('week'), Type.Literal('month') ], { default: 'day' }),
  type: Type.Optional(LogTypeQS),
  action: Type.Optional(LogActionQS),
  success: Type.Optional(Type.Boolean()),
  userId: Type.Optional(Type.Number()),
  itemId: Type.Optional(Type.Number()),
  estoqueId: Type.Optional(Type.Number()),
  tz: Type.Optional(Type.String()),
})

export const TopNQuery = Type.Object({
  inicio: Type.String(),
  fim: Type.String(),
  type: Type.Optional(LogTypeQS),
  action: Type.Optional(LogActionQS),
  success: Type.Optional(Type.Boolean()),
  field: Type.Union([ Type.Literal('route'), Type.Literal('actor'), Type.Literal('item'), Type.Literal('estoque'), Type.Literal('errorCode') ]),
  limit: Type.Optional(Type.Number({ default: 10 })),
})

export const ListQuery = Type.Object({
  inicio: Type.String(),
  fim: Type.String(),
  type: Type.Optional(LogTypeQS),
  action: Type.Optional(LogActionQS),
  success: Type.Optional(Type.Boolean()),
  q: Type.Optional(Type.String()),
  cursor: Type.Optional(Type.String()),
  size: Type.Optional(Type.Number({ default: 50, maximum: 200 })),
})
