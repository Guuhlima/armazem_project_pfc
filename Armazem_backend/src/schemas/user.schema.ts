import { Type } from "@sinclair/typebox";

export const UsuarioBodySchema = Type.Object({
  nome: Type.String(),
  email: Type.String({ format: 'email' }),
  matricula: Type.Integer(),
  senha: Type.String(),
});

export const UsuarioLoginSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  senha: Type.String(),
});

export const UsuarioParamsSchema = Type.Object({
    id: Type.String()
})
