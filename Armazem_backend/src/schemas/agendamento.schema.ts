import { Static, Type } from '@sinclair/typebox';

export const AgendamentoCreateBody = Type.Object({
  itemId: Type.Integer({ minimum: 1 }),
  estoqueOrigemId: Type.Integer({ minimum: 1 }),
  estoqueDestinoId: Type.Integer({ minimum: 1 }),
  quantidade: Type.Integer({ minimum: 1 }),
  executarEm: Type.String({ format: 'date-time' }),
});

export type AgendamentoCreateBodyType = Static<typeof AgendamentoCreateBody>;

export const AgendamentoParams = Type.Object({
  id: Type.String(),
});
export type AgendamentoParamsType = Static<typeof AgendamentoParams>;
