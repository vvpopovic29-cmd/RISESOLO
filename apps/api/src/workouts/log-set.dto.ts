import { z } from "@risesolo/validation";

export const logSetRequestSchema = z.object({
  exerciseId: z.string().min(1),
  reps: z.number().int().nonnegative().nullable().optional(),
  weight: z.number().nonnegative().nullable().optional(),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
  assistance: z.string().nullable().optional(),
  completed: z.boolean(),
});

export type LogSetRequest = z.infer<typeof logSetRequestSchema>;
