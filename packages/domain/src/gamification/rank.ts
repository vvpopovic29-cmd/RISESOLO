export type PlayerRank = "E" | "D" | "C" | "B" | "A" | "S" | "SS" | "SSS";

/** Redosled rangova od najnizeg ka najvisem - isti izvor istine kao `playerRankSchema` u packages/validation. */
export const RANK_ORDER: readonly PlayerRank[] = ["E", "D", "C", "B", "A", "S", "SS", "SSS"];

/**
 * Minimalan Level potreban da se polozi Rank Examination za dati rank
 * (tj. da bi igrac E-ranga mogao da pokusa ispit za D-rank, mora imati
 * bar Level 5). Isto kao Progressive Overload, ovo je "System"
 * pravilima-vodjena logika, ne proizvoljna - namerno konzervativan rast
 * (svaki sledeci rank trazi vise nivoa nego prethodni skok).
 */
export const RANK_LEVEL_REQUIREMENT: Readonly<Record<PlayerRank, number>> = {
  E: 1,
  D: 5,
  C: 10,
  B: 15,
  A: 20,
  S: 25,
  SS: 30,
  SSS: 35,
};

/** Sledeci rank u nizu, ili `null` ako je igrac vec na najvisem (SSS). */
export function getNextRank(currentRank: PlayerRank): PlayerRank | null {
  const index = RANK_ORDER.indexOf(currentRank);
  const next = RANK_ORDER[index + 1];
  return next ?? null;
}

/** Da li igrac ispunjava Level uslov da pokusa Rank Examination za `targetRank`. */
export function meetsRankExamLevelRequirement(level: number, targetRank: PlayerRank): boolean {
  return level >= RANK_LEVEL_REQUIREMENT[targetRank];
}

/**
 * Koliko sati posle neuspesnog (istekog) Rank Examination-a igrac mora da
 * saceka pre nego sto moze da zatrazi novi pokusaj za isti rank - bez ovoga
 * je "boss fight" bez ikakvih posledica za neuspeh (quest jednostavno
 * istekne i novi se odmah moze zatraziti).
 */
export const RANK_EXAM_COOLDOWN_HOURS = 24;

/** Da li je igrac i dalje u cooldown periodu posle isteklog Rank Examination-a za isti rank. */
export function isRankExamOnCooldown(lastFailedExpiresAt: Date, now: Date): boolean {
  const cooldownEndsAt = lastFailedExpiresAt.getTime() + RANK_EXAM_COOLDOWN_HOURS * 60 * 60 * 1000;
  return now.getTime() < cooldownEndsAt;
}

/** Koliko punih sati jos ostaje do kraja cooldown-a (minimum 1, za citljivu poruku korisniku). */
export function rankExamCooldownRemainingHours(lastFailedExpiresAt: Date, now: Date): number {
  const cooldownEndsAt = lastFailedExpiresAt.getTime() + RANK_EXAM_COOLDOWN_HOURS * 60 * 60 * 1000;
  const remainingMs = cooldownEndsAt - now.getTime();
  return Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));
}
