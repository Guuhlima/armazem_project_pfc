import { z } from "zod";

export const deleteSchema = z.object({
    id: z
        .string()
        .min(1, "O ID é obrigatório")
        .refine((val) => !isNaN(Number(val)), "O ID deve ser um número"),
});

export type DeleteFormData = z.infer<typeof deleteSchema>;