import { STAT_KEYS, type StatKey } from "./stats";

/**
 * Main Quest = dugorocni, NEPERIODICNI izazov (za razliku od Daily/Weekly/
 * Boss Quest-a, nikad ne istice niti se resetuje po datumu - traje dok se ne
 * zavrsi). NAMERNO ne dupira Achievements (LEVEL_5/10/20 vec pokriva "dostigni
 * level X") - ovde je fokus na RASTU STATOVA (snaga/agilnost/izdrzljivost/
 * vitalnost/inteligencija), koji Achievements uopste ne prate. Reuse-uje
 * STAT_KEYS direktno (isti 5 atributa kao stat raspodela) umesto da izmislja
 * paralelnu taksonomiju.
 */
export type MainQuestKind = StatKey;
export const MAIN_QUEST_KINDS = STAT_KEYS;

/** Cilj raste za ovoliko po tier-u (tier 1 = 10, tier 2 = 20, ...). */
export const MAIN_QUEST_TIER_STEP = 10;

export function isMainQuestComplete(progress: number, target: number): boolean {
  return progress >= target;
}

/**
 * Lanac Main Quest-ova: posle svakog zavrsenog questa generise se SLEDECI za
 * SLEDECI stat u rotaciji (snaga -> agilnost -> ... -> inteligencija ->
 * ponovo snaga na visem tier-u). `completedCount` = broj vec zavrsenih Main
 * Quest-ova za tog korisnika (izvedeno prebrojavanjem, ne cuvano posebno -
 * isti "derive, don't cache" princip kao total_xp/boss quest progres).
 */
export function selectMainQuestKind(completedCount: number): MainQuestKind {
  const index = completedCount % MAIN_QUEST_KINDS.length;
  // index je uvek u granicama niza - noUncheckedIndexedAccess ovo ne vidi.
  return MAIN_QUEST_KINDS[index] as MainQuestKind;
}

export function mainQuestTier(completedCount: number): number {
  return Math.floor(completedCount / MAIN_QUEST_KINDS.length) + 1;
}

export function mainQuestTarget(tier: number): number {
  return tier * MAIN_QUEST_TIER_STEP;
}
