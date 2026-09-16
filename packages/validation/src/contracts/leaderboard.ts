import { RANKS } from "@risesolo/domain";
import { z } from "zod";

/** Sve vrednosti su izvedene na serveru (isti princip kao PlayerProgressionDto) - `position` se racuna preko poretka po `totalXp`, nikad ne perzistira. */
export const playerLeaderboardEntrySchema = z.object({
  position: z.number().int().min(1),
  userId: z.string(),
  username: z.string(),
  level: z.number().int().min(1),
  rank: z.enum(RANKS),
  totalXp: z.number().int().min(0),
});
export type PlayerLeaderboardEntryDto = z.infer<typeof playerLeaderboardEntrySchema>;

/** `me` je UVEK prisutno (izvan top liste ako korisnikov `position` premasuje `limit`). */
export const playerLeaderboardResponseSchema = z.object({
  entries: z.array(playerLeaderboardEntrySchema),
  me: playerLeaderboardEntrySchema,
});
export type PlayerLeaderboardResponseDto = z.infer<typeof playerLeaderboardResponseSchema>;

export const guildLeaderboardEntrySchema = z.object({
  position: z.number().int().min(1),
  guildId: z.string(),
  name: z.string(),
  tag: z.string(),
  level: z.number().int().min(1),
  totalXp: z.number().int().min(0),
  memberCount: z.number().int().min(0),
});
export type GuildLeaderboardEntryDto = z.infer<typeof guildLeaderboardEntrySchema>;

/** `myGuild` je `null` ako korisnik trenutno nije clan nijednog ceha. */
export const guildLeaderboardResponseSchema = z.object({
  entries: z.array(guildLeaderboardEntrySchema),
  myGuild: guildLeaderboardEntrySchema.nullable(),
});
export type GuildLeaderboardResponseDto = z.infer<typeof guildLeaderboardResponseSchema>;

export const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
