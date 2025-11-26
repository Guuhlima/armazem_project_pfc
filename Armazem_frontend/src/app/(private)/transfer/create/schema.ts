import { z } from 'zod';

export const transferSchema = z.object({
  itemId: z.number().int(),
  estoqueOrigemId: z.number().int(),
  estoqueDestinoId: z.number().int(),
  quantidade: z.number().int().positive(),
  executarEm: z.string().datetime().optional(),
  loteCodigo: z.string().trim().min(1).optional(),
  serialNumero: z.string().trim().min(1).optional(),
}).refine((data) => data.estoqueOrigemId !== data.estoqueDestinoId, {
  message: 'Estoques de origem e destino devem ser diferentes',
  path: ['estoqueDestinoId'],
});

export type TransferSchemaType = z.infer<typeof transferSchema>;