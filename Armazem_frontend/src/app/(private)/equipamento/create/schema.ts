import { z } from 'zod';

export const itemSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  quantidade: z.coerce.number().min(1, 'Quantidade deve ser maior que zero'),
  minimo: z.coerce.number().min(1, 'Quantidade de valor minimo ao estoque tem que ser maior que zero'),
  data: z.string().min(1, 'Data é obrigatória'),

  vincularEstoque: z.preprocess(
    (val) => val === 'on' || val === true,
    z.boolean()
  ).default(false),

  estoqueId: z.coerce.number().optional(),
  rastreioTipo: z.enum(['NONE', 'LOTE', 'SERIAL']).default('NONE'),
});

export type ItemFormData = z.infer<typeof itemSchema>;
