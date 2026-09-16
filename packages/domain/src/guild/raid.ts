/**
 * Guild Quests & Raids - nedeljni cehovski izazov (ogledalo licnog Boss
 * Quest-a, ali agregirano preko svih clanova). Progres se NE cuva posebno -
 * racuna se prebrojavanjem zavrsenih treninga svih clanova te ISO nedelje
 * (isti princip kao Boss Quest - izvedeno, ne perzistirano).
 */
export const GUILD_RAID_TARGET_CONTRIBUTIONS = 20;
export const GUILD_RAID_COIN_REWARD = 1000;

/// Nema IN_PROGRESS (za razliku od QuestStatus) - raid nema licni "u toku" korak, samo AVAILABLE -> COMPLETED/EXPIRED.
export const GUILD_RAID_STATUSES = ["AVAILABLE", "COMPLETED", "EXPIRED"] as const;
export type GuildRaidStatus = (typeof GUILD_RAID_STATUSES)[number];

export function isGuildRaidComplete(completedWorkoutsThisWeek: number, target: number): boolean {
  return completedWorkoutsThisWeek >= target;
}
