/**
 * Hidden Items - prvi izvor u Inventory sistemu. Za razliku od Achievements
 * (pragovi su unapred vidljivi igracu), Hidden Item uslovi su NAMERNO tajni -
 * igrac ih otkriva slucajno kroz igru, klijent prikazuje "???" dok se ne
 * otkriju (vidi InventoryService.listForUser u apps/api). Isti "derive, don't
 * cache" princip kao Achievements: `isMet` racuna nad svezim snapshot-om iz
 * postojecih tabela, nista posebno se ne belezi tokom igre da bi se uslov
 * proverio - server samo upisuje CINJENICU otkrivanja kad se uslov prvi put
 * ispuni.
 */

export const HIDDEN_ITEM_IDS = [
  "MIDNIGHT_WARRIOR",
  "CENTURY_CLUB",
  "BALANCED_WARRIOR",
  "COIN_HOARDER",
  "UNBROKEN_DISCIPLINE",
] as const;
export type HiddenItemId = (typeof HIDDEN_ITEM_IDS)[number];

export interface HiddenItemStatsSnapshot {
  /** Bar jedna zavrsena sesija cije `completedAt` (UTC sat) pada u [0, 4). */
  hasMidnightWorkout: boolean;
  /** Najveci zbir `reps` odradjenih (completed) serija u JEDNOJ sesiji. */
  maxSingleSessionReps: number;
  /** Min/max od 5 osnovnih atributa (STR/AGI/END/VIT/INT) - "koliko su izbalansirani". */
  minStatValue: number;
  maxStatValue: number;
  coins: number;
  currentStreak: number;
  /** Koliko puta je ikad generisan PENALTY quest (= koliko puta je igrac ikad kaznjen). */
  penaltyQuestsEverApplied: number;
}

export interface HiddenItemDefinition {
  id: HiddenItemId;
  isMet: (snapshot: HiddenItemStatsSnapshot) => boolean;
}

export const HIDDEN_ITEM_DEFINITIONS: readonly HiddenItemDefinition[] = [
  { id: "MIDNIGHT_WARRIOR", isMet: (s) => s.hasMidnightWorkout },
  { id: "CENTURY_CLUB", isMet: (s) => s.maxSingleSessionReps >= 100 },
  { id: "BALANCED_WARRIOR", isMet: (s) => s.minStatValue >= 15 && s.maxStatValue - s.minStatValue <= 2 },
  { id: "COIN_HOARDER", isMet: (s) => s.coins >= 5000 },
  { id: "UNBROKEN_DISCIPLINE", isMet: (s) => s.currentStreak >= 7 && s.penaltyQuestsEverApplied === 0 },
];

/**
 * Vraca ID-jeve Hidden Item-a ciji je uslov ispunjen u datom snapshot-u a
 * korisnik ih jos nema u `alreadyDiscovered` - poziva se posle svakog
 * relevantnog dogadjaja (workout completion), servisni sloj perzistira samo
 * novo otkrivene (isti princip kao evaluateNewlyUnlockedAchievements).
 */
export function evaluateNewlyDiscoveredHiddenItems(
  snapshot: HiddenItemStatsSnapshot,
  alreadyDiscovered: ReadonlySet<HiddenItemId>,
): HiddenItemId[] {
  return HIDDEN_ITEM_DEFINITIONS.filter(
    (definition) => !alreadyDiscovered.has(definition.id) && definition.isMet(snapshot),
  ).map((definition) => definition.id);
}
