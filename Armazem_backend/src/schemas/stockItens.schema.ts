import { Type } from '@sinclair/typebox';

export const EstoqueItemBodySchema = Type.Object({
  itemId: Type.Number({ minimum: 1 }),
  quantidade: Type.Number({ minimum: 1 }),
  minimo: Type.Number({ minimum: 1}), 
  loteCodigo: Type.Optional(Type.String()),
  validade: Type.Optional(Type.String()),
  serialNumero: Type.Optional(Type.String()),
  referencia: Type.Optional(Type.Object({
      tabela: Type.Optional(Type.String()),
      id: Type.Optional(Type.Number()),
  }))
});

export const EstoqueItemParamsSchema = Type.Object({
  id: Type.String()
});

export const EstoqueItemQuantidadeParamsSchema = Type.Object({
  estoqueId: Type.String(),
  itemId: Type.String(),
});
