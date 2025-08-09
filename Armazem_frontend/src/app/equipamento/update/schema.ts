import { z } from "zod";

export const itemEditSchema = z.object({
  equipamento: z.string().min(1, "Equipamento é obrigatório"),
  quantidade: z.string().min(1, "Quantidade é obrigatória"),
  data: z.string().min(1, "Data é obrigatória"),
});

export type ItemEditFormData = z.infer<typeof itemEditSchema>;
