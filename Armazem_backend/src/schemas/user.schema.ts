import { Type } from "@sinclair/typebox";

export const UsuarioBodySchema = Type.Object({
  nome: Type.String(),
  email: Type.String({ format: "email" }),
  senha: Type.String({ minLength: 6 }),
  aceiteCookies: Type.Literal(true),
}, { additionalProperties: false });

export const UsuarioLoginSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  senha: Type.String(),
});

export const UsuarioParamsSchema = Type.Object({
    id: Type.String()
})
