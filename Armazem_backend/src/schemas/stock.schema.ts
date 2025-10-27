import { Type } from '@sinclair/typebox';

export const EstoqueBodySchema = Type.Object({
    nome: Type.String()
});

export const EstoqueParamsSchema = Type.Object({
    id: Type.String()
});

export const SugerirFefoQuerySchema = Type.Object({
  itemId: Type.String(),
  estoqueId: Type.String(),
  take: Type.Optional(Type.String()),
});

export const PickingFefoBodySchema = Type.Object({
  estoqueId: Type.Number(),
  itemId: Type.Number(),
  quantidadeSolicitada: Type.Number({ minimum: 1 }),
  referencia: Type.Optional(Type.Object({
    tabela: Type.Optional(Type.String()),
    id: Type.Optional(Type.Number()),
  })),
});

export const SaidaSerialBodySchema = Type.Object({
  estoqueId: Type.Number(),
  itemId: Type.Number(),
  serialNumero: Type.String(),
  referencia: Type.Optional(Type.Object({
    tabela: Type.Optional(Type.String()),
    id: Type.Optional(Type.Number()),
  })),
});

export const EstoqueItemParamsSchema = Type.Object({
  estoqueId: Type.String(),
  itemId: Type.String(),
});

export const AutoBodySchema = Type.Partial(Type.Object({
  autoAtivo: Type.Boolean(),
  maximo: Type.Union([Type.Number(), Type.Null()]),
  multiplo: Type.Union([Type.Number(), Type.Null()]),
  origemPreferidaId: Type.Union([Type.Number(), Type.Null()]),
  leadTimeDias: Type.Union([Type.Number(), Type.Null()]),
}));