import { z } from 'zod';

export const itemSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  quantidade: z.coerce.number().min(1, 'Quantidade deve ser maior que zero'),
  data: z.string().min(1, 'Data é obrigatória'),

  vincularEstoque: z.preprocess(
    (val) => val === 'on' || val === true,
    z.boolean()
  ).default(false),

  estoqueId: z.coerce.number().optional(),
});

export type ItemFormData = z.infer<typeof itemSchema>;
