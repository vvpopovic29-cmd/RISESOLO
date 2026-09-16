import { GUILD_RAID_STATUSES, GUILD_ROLES } from "@risesolo/domain";
import { z } from "zod";

export const createGuildRequestSchema = z.object({
  name: z.string().min(3).max(30),
  tag: z
    .string()
    .min(2)
    .max(6)
    .regex(/^[A-Z0-9]+$/, "Tag sme sadrzati samo velika slova i brojeve"),
  description: z.string().max(200).optional(),
});
export type CreateGuildRequest = z.infer<typeof createGuildRequestSchema>;

export const joinGuildRequestSchema = z.object({
  tag: z.string().min(2).max(6),
});
export type JoinGuildRequest = z.infer<typeof joinGuildRequestSchema>;

/** OFFICER/MEMBER samo - LEADER se menja iskljucivo kroz transfer (napustanje/nasledjivanje), ne kroz ovaj endpoint. */
export const changeGuildMemberRoleRequestSchema = z.object({
  role: z.enum(["OFFICER", "MEMBER"]),
});
export type ChangeGuildMemberRoleRequest = z.infer<typeof changeGuildMemberRoleRequestSchema>;

export const donateToGuildRequestSchema = z.object({
  coins: z.number().int().min(1),
});
export type DonateToGuildRequest = z.infer<typeof donateToGuildRequestSchema>;

export const postGuildMessageRequestSchema = z.object({
  message: z.string().min(1).max(280),
});
export type PostGuildMessageRequest = z.infer<typeof postGuildMessageRequestSchema>;

export const guildMemberSchema = z.object({
  userId: z.string(),
  username: z.string(),
  role: z.enum(GUILD_ROLES),
  joinedAt: z.string(),
});
export type GuildMemberDto = z.infer<typeof guildMemberSchema>;

/**
 * Nedeljni cehovski raid (ogledalo BossQuestDto) - `progress`/`targetContributions`
 * su zbir zavrsenih treninga SVIH clanova te ISO nedelje (izvedeno na
 * serveru, ne perzistirano - vidi apps/api/src/guilds).
 */
export const guildRaidSchema = z.object({
  id: z.string(),
  weekStart: z.string(),
  targetContributions: z.number().int(),
  progress: z.number().int(),
  coinReward: z.number().int(),
  status: z.enum(GUILD_RAID_STATUSES),
});
export type GuildRaidDto = z.infer<typeof guildRaidSchema>;

export const guildMessageSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  message: z.string(),
  createdAt: z.string(),
});
export type GuildMessageDto = z.infer<typeof guildMessageSchema>;

/** Za javnu listu/pretragu (GET /guilds) - bez internih detalja (riznica, poruke, clanovi). */
export const guildSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  tag: z.string(),
  level: z.number().int(),
  memberCount: z.number().int(),
});
export type GuildSummaryDto = z.infer<typeof guildSummarySchema>;

/** GET /guilds/me - pun pregled ceha za trenutnog korisnika, sa svim izvedenim progression vrednostima. */
export const guildDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  tag: z.string(),
  description: z.string().nullable(),
  level: z.number().int(),
  totalXp: z.number().int(),
  currentLevelXp: z.number().int(),
  requiredXp: z.number().int(),
  progress: z.number(),
  treasuryCoins: z.number().int(),
  myRole: z.enum(GUILD_ROLES),
  members: z.array(guildMemberSchema),
  raid: guildRaidSchema,
});
export type GuildDetailDto = z.infer<typeof guildDetailSchema>;
