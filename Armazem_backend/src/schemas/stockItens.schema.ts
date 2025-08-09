import { Type } from '@sinclair/typebox';

export const EstoqueItemBodySchema = Type.Object({
  itemId: Type.Number({ minimum: 1 }),
  quantidade: Type.Number({ minimum: 1 })
});

export const EstoqueItemParamsSchema = Type.Object({
  id: Type.String()
});

export const EstoqueItemQuantidadeParamsSchema = Type.Object({
  estoqueId: Type.String(),
  itemId: Type.String(),
});
