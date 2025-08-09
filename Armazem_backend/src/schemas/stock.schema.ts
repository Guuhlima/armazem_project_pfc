import { Type } from '@sinclair/typebox';

export const EstoqueBodySchema = Type.Object({
    nome: Type.String()
});

export const EstoqueParamsSchema = Type.Object({
    id: Type.String()
});