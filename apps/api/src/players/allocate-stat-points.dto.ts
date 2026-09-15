import { z } from "@risesolo/validation";

/**
 * Doslovno STAT_KEYS iz @risesolo/domain (STRENGTH/AGILITY/ENDURANCE/
 * VITALITY/INTELLIGENCE) - z.enum trazi literal tuple, pa se ne moze
 * izvesti direktno iz `readonly StatKey[]` bez gubitka literal tipova.
 */
export const allocateStatPointsRequestSchema = z.object({
  statKey: z.enum(["STRENGTH", "AGILITY", "ENDURANCE", "VITALITY", "INTELLIGENCE"]),
  amount: z.number().int().positive(),
});

export type AllocateStatPointsRequest = z.infer<typeof allocateStatPointsRequestSchema>;
