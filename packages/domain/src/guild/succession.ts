import type { GuildRole } from "./roles";

export interface GuildMemberForSuccession {
  userId: string;
  role: GuildRole;
  joinedAt: Date;
}

/**
 * Kada LEADER napusti ceh, bira se sledeci: prvo najstariji (po datumu
 * pridruzivanja) OFFICER, a ako nema nijednog, najstariji preostali MEMBER.
 * Vraca `null` ako ceh ostaje bez ijednog clana (raspustanje).
 */
export function selectNextLeader(remainingMembers: readonly GuildMemberForSuccession[]): string | null {
  if (remainingMembers.length === 0) {
    return null;
  }

  const officers = remainingMembers.filter((member) => member.role === "OFFICER");
  const pool = officers.length > 0 ? officers : remainingMembers;

  return pool.reduce((oldest, member) => (member.joinedAt < oldest.joinedAt ? member : oldest)).userId;
}
