import { Type } from '@sinclair/typebox';

export const EquipamentoBodySchema = Type.Object({
  nome: Type.String(),
  quantidade: Type.Integer(),
  data: Type.String({ format: 'date' }),
  rastreioTipo: Type.Optional(
    Type.Union([
      Type.Literal('NONE'),
      Type.Literal('LOTE'),
      Type.Literal('SERIAL'),
    ])
  ),
});

export const EquipamentoParamsSchema = Type.Object({
  id: Type.String()
});
