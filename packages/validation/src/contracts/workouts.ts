import { z } from "zod";

export const startWorkoutSessionRequestSchema = z.object({
  workoutId: z.string().optional(),
});
export type StartWorkoutSessionRequest = z.infer<typeof startWorkoutSessionRequestSchema>;

export const workoutSessionSchema = z.object({
  id: z.string(),
  workoutId: z.string().nullable(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "ABANDONED"]),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
});
export type WorkoutSessionDto = z.infer<typeof workoutSessionSchema>;

/** Jedna vec ulogovana serija - koristi se za hidraciju kad se pauzirana sesija nastavlja. */
export const workoutSetSchema = z.object({
  exerciseId: z.string(),
  exerciseSlug: z.string(),
  exerciseName: z.string(),
  setNumber: z.number().int(),
  reps: z.number().int().nullable(),
  durationSeconds: z.number().int().nullable(),
  completed: z.boolean(),
});
export type WorkoutSetDto = z.infer<typeof workoutSetSchema>;

/**
 * GET /workouts/sessions/active - korisnikova trenutna IN_PROGRESS sesija
 * (najvise jedna po korisniku, vidi WorkoutsService.startSession) sa vec
 * ulogovanim serijama. `session: null` znaci da nema pauziranog treninga
 * (NAMERNO ugnjezdeno, ne top-level null - NestJS/Express salje prazno telo
 * bez Content-Type kad kontroler vrati "goli" null, sto razbija JSON parsing
 * na klijentu).
 */
export const activeWorkoutSessionSchema = z.object({
  session: workoutSessionSchema.nullable(),
  sets: z.array(workoutSetSchema),
});
export type ActiveWorkoutSessionResponse = z.infer<typeof activeWorkoutSessionSchema>;

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
  /** 0 ako korisnik nije u cehu - vidi apps/api/src/guilds. */
  guildXpContributed: z.number().int(),
  guildRaidCompleted: z.boolean(),
});
export type CompleteWorkoutResponse = z.infer<typeof completeWorkoutResponseSchema>;
