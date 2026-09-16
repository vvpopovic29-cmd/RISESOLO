/**
 * Guild Management - struktura uloga u cehu. `MEMBER_CAP` je namerno fiksan
 * (bez placenih prosirenja u MVP-u - to bi bilo RevenueCat/premium, van obima).
 */
export const GUILD_ROLES = ["LEADER", "OFFICER", "MEMBER"] as const;
export type GuildRole = (typeof GUILD_ROLES)[number];

export const GUILD_MEMBER_CAP = 20;

/** LEADER moze da izbaci OFFICER/MEMBER; OFFICER samo MEMBER-a; niko ne moze da izbaci LEADER-a (mora se prvo transferovati/napustiti). */
export function canKick(actorRole: GuildRole, targetRole: GuildRole): boolean {
  if (targetRole === "LEADER") return false;
  if (actorRole === "LEADER") return true;
  if (actorRole === "OFFICER") return targetRole === "MEMBER";
  return false;
}

/** Samo LEADER unapredjuje/unazadjuje OFFICER<->MEMBER. */
export function canChangeRole(actorRole: GuildRole): boolean {
  return actorRole === "LEADER";
}

/** Samo LEADER raspodeljuje riznicu clanovima. */
export function canDistributeTreasury(actorRole: GuildRole): boolean {
  return actorRole === "LEADER";
}
