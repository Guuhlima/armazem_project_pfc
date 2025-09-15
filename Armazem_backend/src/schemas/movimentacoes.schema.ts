import { Static, Type } from '@sinclair/typebox'

const DateLoose = Type.Union([
  Type.String({ format: 'date-time' }),
  Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
]);

export const MovQuerySchema = Type.Object({
    inicio: Type.Optional(DateLoose),
    fim:    Type.Optional(DateLoose),
    itemId: Type.Optional(Type.String()),
    estoqueId: Type.Optional(Type.String()),
    granularity: Type.Optional(Type.Union([
        Type.Literal('day'),
        Type.Literal('hour')
    ])),
});

export type MovQueryType = Static<typeof MovQuerySchema>;