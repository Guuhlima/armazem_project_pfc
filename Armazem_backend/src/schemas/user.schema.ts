import { Type } from '@sinclair/typebox';

export const UsuarioCreateBodySchema = Type.Object(
  {
    nome: Type.Optional(Type.Union([Type.String({ maxLength: 255 }), Type.Null()])),
    email: Type.String({ format: 'email' }),
    senha: Type.String({ minLength: 6 }),
    aceiteCookies: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false }
);

export const UsuarioUpdateBodySchema = Type.Object(
  {
    nome: Type.Optional(Type.Union([Type.String({ maxLength: 255 }), Type.Null()])),
    email: Type.Optional(Type.String({ format: 'email' })),
    senha: Type.Optional(Type.String({ minLength: 6 })),
  },
  { additionalProperties: false }
);

export const UsuarioParamsSchema = Type.Object({
  id: Type.Number({ minimum: 1 }), // melhor que string
});

export const UsuarioLoginSchema = Type.Object(
  {
    email: Type.String({ format: 'email' }),
    senha: Type.String(),
  },
  { additionalProperties: false }
);
