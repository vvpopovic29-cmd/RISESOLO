import { z } from "@risesolo/validation";

/** Tacno jedno od templateId (postojeci plan) ili exerciseIds (freeform, Faza 5). */
export const startWorkoutRequestSchema = z
  .object({
    templateId: z.string().uuid().optional(),
    exerciseIds: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine((data) => Boolean(data.templateId) !== Boolean(data.exerciseIds), {
    message: "Prosledi tacno jedno od templateId ili exerciseIds",
  });

export type StartWorkoutRequest = z.infer<typeof startWorkoutRequestSchema>;
