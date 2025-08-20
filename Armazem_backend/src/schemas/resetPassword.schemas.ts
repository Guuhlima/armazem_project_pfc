import { Type } from '@sinclair/typebox';

export const RequestResetSchema = Type.Object({
  email: Type.String({ format: 'email' }),
});

export const ValidateTokenSchema = Type.Object({
  token: Type.String(),
});

export const ConfirmResetSchema = Type.Object({
  token: Type.String(),
  novaSenha: Type.String({ minLength: 8 }),
});
