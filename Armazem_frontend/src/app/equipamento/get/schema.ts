import { z } from 'zod';

export const getSchema = z.object({
    id: z
        .string()
        .min(1, 'O ID é obrigatório')
        .refine((val) => !isNaN(Number(val)), 'O ID deve ser um número')
});

export type GetFormData = z.infer<typeof getSchema>
