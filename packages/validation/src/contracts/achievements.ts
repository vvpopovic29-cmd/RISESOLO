import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_IDS } from "@risesolo/domain";
import { z } from "zod";

/** GET /achievements - katalog svih achievement-a (i otkljucanih i zakljucanih) za trenutnog korisnika. */
export const achievementSchema = z.object({
  id: z.enum(ACHIEVEMENT_IDS),
  category: z.enum(ACHIEVEMENT_CATEGORIES),
  unlocked: z.boolean(),
  unlockedAt: z.string().datetime().nullable(),
});
export type AchievementDto = z.infer<typeof achievementSchema>;

export const listAchievementsResponseSchema = z.array(achievementSchema);
export type ListAchievementsResponse = z.infer<typeof listAchievementsResponseSchema>;
