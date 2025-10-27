import { Type } from "@sinclair/typebox";

export const RecebimentoBodySchema = Type.Object({
  estoqueId: Type.Number(),
  itemId: Type.Number(),
  quantidade: Type.Number({ minimum: 1 }),
  loteCodigo: Type.Optional(Type.String()),
  validade: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  serialNumero: Type.Optional(Type.String()),
  referencia: Type.Optional(
    Type.Object({
      tabela: Type.Optional(Type.String()),
      id: Type.Optional(Type.Number()),
    })
  ),
});

export type RecebimentoBodyType = typeof RecebimentoBodySchema;