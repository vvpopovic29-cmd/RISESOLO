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
