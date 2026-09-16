import { RANKS, STAT_KEYS } from "@risesolo/domain";
import { z } from "zod";

export const playerStatsSchema = z.object({
  strength: z.number().int().min(0),
  agility: z.number().int().min(0),
  endurance: z.number().int().min(0),
  vitality: z.number().int().min(0),
  intelligence: z.number().int().min(0),
  statPoints: z.number().int().min(0),
});
export type PlayerStatsDto = z.infer<typeof playerStatsSchema>;

/** Sve vrednosti su izvedene na serveru (calculateLevel/calculateRank iz @risesolo/domain) - nikad prosledjene od klijenta. */
export const playerProgressionSchema = z.object({
  totalXp: z.number().int().min(0),
  level: z.number().int().min(1),
  currentLevelXp: z.number().int().min(0),
  requiredXp: z.number().int().min(1),
  progress: z.number().min(0).max(1),
  rank: z.enum(RANKS),
  coins: z.number().int().min(0),
  currentStreak: z.number().int().min(0),
});
export type PlayerProgressionDto = z.infer<typeof playerProgressionSchema>;

export const playerProfileSchema = z.object({
  username: z.string(),
  avatarUrl: z.string().nullable(),
  age: z.number().int().nullable(),
  heightCm: z.number().int().nullable(),
  weightKg: z.number().nullable(),
  trainingType: z.string().nullable(),
  experienceLevel: z.string().nullable(),
  /** `true` nakon POST /players/me/onboarding - koristi klijent da odluci da li prikazuje onboarding ekran. */
  onboarded: z.boolean(),
  /** Izvedeno iz Profile.equippedTitleId preko Coin Shop kataloga (vidi apps/api/src/shop) - `null` ako nista nije opremljeno. */
  title: z.string().nullable(),
  /** Izvedeno iz Profile.equippedAvatarFrameId - hex boja, `null` ako nista nije opremljeno. */
  avatarFrameColorHex: z.string().nullable(),
});
export type PlayerProfileDto = z.infer<typeof playerProfileSchema>;

/**
 * Penalty System (apps/api/src/quests expirePastDueDailyQuests) - `applied`
 * je `true` SAMO na pozivu koji je upravo primenio kaznu (propusteni quest
 * postaje EXPIRED, sto sluzi kao idempotency marker - sledeci poziv vec
 * vidi `applied: false` za isti propusteni dan).
 */
export const penaltyResultSchema = z.object({
  applied: z.boolean(),
  missedQuestCount: z.number().int().min(0),
  coinsLost: z.number().int().min(0),
});
export type PenaltyResultDto = z.infer<typeof penaltyResultSchema>;

export const playerStateSchema = z.object({
  profile: playerProfileSchema,
  progression: playerProgressionSchema,
  stats: playerStatsSchema,
  penalty: penaltyResultSchema,
});
export type PlayerStateDto = z.infer<typeof playerStateSchema>;

export const onboardProfileRequestSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/),
  age: z.number().int().min(13).max(100).optional(),
  heightCm: z.number().int().min(100).max(250).optional(),
  weightKg: z.number().min(30).max(300).optional(),
  trainingType: z.enum(["CALISTHENICS", "GYM", "BOTH"]).optional(),
  experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
});
export type OnboardProfileRequest = z.infer<typeof onboardProfileRequestSchema>;

const statAllocationShape = Object.fromEntries(
  STAT_KEYS.map((key: (typeof STAT_KEYS)[number]) => [key, z.number().int().min(0).optional()]),
) as Record<(typeof STAT_KEYS)[number], z.ZodOptional<z.ZodNumber>>;

export const allocateStatPointsRequestSchema = z.object(statAllocationShape).refine(
  (allocation) => Object.values(allocation).some((value) => (value ?? 0) > 0),
  { message: "Raspodela mora sadrzati bar jedan poen" },
);
export type AllocateStatPointsRequest = z.infer<typeof allocateStatPointsRequestSchema>;
