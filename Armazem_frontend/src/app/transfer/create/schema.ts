import { z } from 'zod';

export const transferSchema = z.object({
  itemId: z.coerce.number().int(),
  estoqueOrigemId: z.coerce.number().int(),
  estoqueDestinoId: z.coerce.number().int(),
  quantidade: z.coerce.number().min(1, 'A quantidade deve ser maior que 0'),
}).superRefine((data, ctx) => {
  if (data.estoqueDestinoId === data.estoqueOrigemId) {
    ctx.addIssue({
      path: ['estoqueDestinoId'],
      code: z.ZodIssueCode.custom,
      message: 'O estoque de destino deve ser diferente do estoque de origem',
    });
  }
});

export type TransferSchemaType = z.infer<typeof transferSchema>;
