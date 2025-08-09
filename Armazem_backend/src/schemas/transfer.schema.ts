import { Type } from '@sinclair/typebox';

export const TransferenciaBodySchema = Type.Object({
    itemId: Type.Integer(),
    estoqueOrigemId: Type.Integer(),
    estoqueDestinoId: Type.Integer(),
    quantidade: Type.Integer({ minimum: 1 }),
});

export const TransferenciaParamsSchema = Type.Object({
    id: Type.String(),
});
