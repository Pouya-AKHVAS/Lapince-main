import { z } from "zod";

export const categorySchema = z.object({


name: z.string().min(1, "Le nom est obligatoire"),
color : z.string().optional(),
icon :  z.string().optional(),
type: z.enum(["EXPENSE", "INCOME"]),
})