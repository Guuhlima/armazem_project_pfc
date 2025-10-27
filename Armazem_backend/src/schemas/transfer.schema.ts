import { Type } from '@sinclair/typebox';

export const TransferenciaBodySchema = Type.Object({
    itemId: Type.Integer(),
    estoqueOrigemId: Type.Integer(),
    estoqueDestinoId: Type.Integer(),
    quantidade: Type.Integer({ minimum: 1 }),
    loteCodigo: Type.Optional(Type.String()),
    serialNumero: Type.Optional(Type.String()),
    referencia: Type.Optional(Type.Object({
        tabela: Type.Optional(Type.String()),
        id: Type.Optional(Type.Number()),
    }))
});

export const TransferenciaParamsSchema = Type.Object({
    id: Type.String(),
});
