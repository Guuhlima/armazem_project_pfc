import { Type } from "@sinclair/typebox";

export const EstoqueMinimoBodySchema = Type.Object({
    minimo: Type.Number({ minimum: 0})
})