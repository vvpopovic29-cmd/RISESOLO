import { z } from "zod";

/**
 * Faza 4 DTO ugovor - Achievements/Titles. Katalog (`achievements`) je
 * javan; ovaj response spaja katalog sa `unlocked`/`unlockedAt` stanjem za
 * trenutnog igraca. Otkljucavanje ide iskljucivo kroz
 * `fn_evaluate_achievements` (backend), nikad direktno sa klijenta.
 */

export const achievementCategorySchema = z.enum([
  "training",
  "consistency",
  "nutrition",
  "progression",
]);
export type AchievementCategory = z.infer<typeof achievementCategorySchema>;

export const achievementRequirementTypeSchema = z.enum([
  "workout_count",
  "personal_record_count",
  "longest_streak",
  "level",
  "meal_log_count",
  "water_log_count",
  "quest_completed_count",
]);
export type AchievementRequirementType = z.infer<typeof achievementRequirementTypeSchema>;

export const achievementResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  description: z.string(),
  category: achievementCategorySchema,
  requirementType: achievementRequirementTypeSchema,
  requirementValue: z.number().int().positive(),
  xpReward: z.number().int().min(0),
  coinReward: z.number().int().min(0),
  unlocked: z.boolean(),
  unlockedAt: z.string().nullable(),
});
export type AchievementResponse = z.infer<typeof achievementResponseSchema>;
