import { z } from 'zod';

export const createEstoqueSchema = z.object({
  nome: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
});

export type CreateEstoqueSchemaType = z.infer<typeof createEstoqueSchema>;
