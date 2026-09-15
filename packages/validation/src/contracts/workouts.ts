import { z } from "zod";

export const startWorkoutSessionRequestSchema = z.object({
  workoutId: z.string().optional(),
});
export type StartWorkoutSessionRequest = z.infer<typeof startWorkoutSessionRequestSchema>;

export const workoutSessionSchema = z.object({
  id: z.string(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "ABANDONED"]),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
});
export type WorkoutSessionDto = z.infer<typeof workoutSessionSchema>;

export const logSetRequestSchema = z
  .object({
    exerciseId: z.string(),
    setNumber: z.number().int().min(1),
    reps: z.number().int().min(0).optional(),
    weightKg: z.number().min(0).optional(),
    durationSeconds: z.number().int().min(0).optional(),
    completed: z.boolean(),
  })
  .refine((set) => set.reps !== undefined || set.durationSeconds !== undefined, {
    message: "Serija mora imati reps ili durationSeconds",
  });
export type LogSetRequest = z.infer<typeof logSetRequestSchema>;

/**
 * Odgovor completion engine-a (apps/api/src/workouts) - jedini mesto gde
 * XP/level/coins/streak vrednosti nastaju. Klijent ovo samo prikazuje.
 */
export const completeWorkoutResponseSchema = z.object({
  success: z.literal(true),
  xpGained: z.number().int(),
  totalXp: z.number().int(),
  level: z.number().int(),
  levelUp: z.boolean(),
  statPointsGained: z.number().int(),
  coinsGained: z.number().int(),
  coins: z.number().int(),
  questCompleted: z.boolean(),
  bossQuestCompleted: z.boolean(),
  streak: z.number().int(),
});
export type CompleteWorkoutResponse = z.infer<typeof completeWorkoutResponseSchema>;
