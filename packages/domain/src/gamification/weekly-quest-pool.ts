/**
 * Nedeljni quest - drugi tier sedmicnog izazova, ODVOJEN od Boss Quest-a
 * (koji je iskljucivo "N zavrsenih treninga ove nedelje" - vidi boss-quest.ts).
 * Kind-ovi ovde NAMERNO ne dupliraju taj broj treninga - oslanjaju se na
 * postojece podatke (XP dogadjaji, ishrana) da bi ohrabrili siru doslednost
 * preko nedelje, ne samo broj treninga.
 */
export const WEEKLY_QUEST_KINDS = ["XP_TARGET", "NUTRITION_LOG_DAYS"] as const;
export type WeeklyQuestKind = (typeof WEEKLY_QUEST_KINDS)[number];

/** Cilj za XP_TARGET kind - ukupan XP osvojen (iz bilo kog izvora) tokom ISO nedelje. */
export const WEEKLY_XP_TARGET = 800;

/** Cilj za NUTRITION_LOG_DAYS kind - broj RAZLICITIH dana te nedelje sa bar jednim unosom ishrane. */
export const WEEKLY_NUTRITION_LOG_DAYS_TARGET = 4;

export function isWeeklyQuestComplete(progress: number, target: number): boolean {
  return progress >= target;
}

/**
 * Deterministicki izbor po (userId, ISO nedelja) - isti princip kao
 * selectDailyQuestKind (vidi daily-quest-pool.ts): isti korisnik uvek dobija
 * isti kind za istu nedelju, razliciti korisnici/nedelje prirodno variraju.
 */
export function selectWeeklyQuestKind(userId: string, weekStart: Date): WeeklyQuestKind {
  const seed = `${userId}:${weekStart.toISOString().slice(0, 10)}`;
  const hash = hashSeed(seed);
  // hash % length je uvek u granicama niza - noUncheckedIndexedAccess ovo ne vidi.
  return WEEKLY_QUEST_KINDS[hash % WEEKLY_QUEST_KINDS.length] as WeeklyQuestKind;
}

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
