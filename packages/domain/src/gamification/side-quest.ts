/**
 * Side Quest = bonus izazov vezan za konkretan trening (vidi apps/api/src/quests).
 * MVP ima samo jednu vrstu - "nova vezba": zavrsi set vezbe koju igrac nikad
 * pre nije zavrsio. Za razliku od Weekly/Main Questa, ovaj se NE moze lenjo
 * zavrsiti na GET pozivu jer uslov nije nezavisno izvodljiv u proizvoljnom
 * trenutku (vezan je za konkretnu sesiju treninga) - zavrsava se iskljucivo
 * unutar completeSession transakcije.
 */
export const SIDE_QUEST_KINDS = ["NEW_EXERCISE"] as const;
export type SideQuestKind = (typeof SIDE_QUEST_KINDS)[number];
export const SIDE_QUEST_KIND: SideQuestKind = "NEW_EXERCISE";

export const SIDE_QUEST_TARGET = 1;

export function isSideQuestComplete(progress: number, target: number): boolean {
  return progress >= target;
}
