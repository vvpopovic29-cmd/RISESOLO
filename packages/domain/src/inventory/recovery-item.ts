/**
 * Recovery Items - sesti izvor u Inventory sistemu. Za razliku od Guild
 * Item-a (kolektivni cehovski snapshot), Recovery Item je VIDLJIV katalog
 * (kao Guild) KOJI SE AUTOMATSKI DODELJUJE (GET-only, kao Hidden/Guild), ali
 * na osnovu LICNOG obrasca odmora izmedju treninga - isti "derive, don't
 * cache" princip (snapshot se svez racuna iz WorkoutSession.completedAt
 * datuma, nista posebno se ne belezi tokom igre). Namerno slavi ODMOR
 * (rest days izmedju treninga), ne samo "vise treninga" - za razliku od
 * svih ostalih izvora koji nagradjuju iskljucivo aktivnost/performans.
 */

export const RECOVERY_ITEM_IDS = [
  "FIRST_REST_DAY",
  "THE_COMEBACK",
  "RESTED_ROUTINE",
  "LONG_HAUL_RETURN",
  "MARATHON_PATIENCE",
] as const;
export type RecoveryItemId = (typeof RECOVERY_ITEM_IDS)[number];

export interface RecoveryItemStatsSnapshot {
  /** Broj DANA (ne kalendarski raspon) izmedju dva uzastopna treninga, najveci ikad odradjen (0/1 ako nema bar 2 treninga - nema pauze da se racuna). */
  maxGapDays: number;
  /** Broj "pauza" (razmaka izmedju dva uzastopna treninga) koje su >= 2 dana - koliko puta je igrac odmorio bar jedan pun dan izmedju treninga. */
  restfulGapCount: number;
  /** Broj RAZLICITIH kalendarskih dana sa bar jednim zavrsenim treningom (ukupno, ne uzastopno). */
  totalTrainingDays: number;
}

export interface RecoveryItemDefinition {
  id: RecoveryItemId;
  isMet: (snapshot: RecoveryItemStatsSnapshot) => boolean;
}

export const RECOVERY_ITEM_DEFINITIONS: readonly RecoveryItemDefinition[] = [
  { id: "FIRST_REST_DAY", isMet: (s) => s.maxGapDays >= 2 },
  { id: "THE_COMEBACK", isMet: (s) => s.maxGapDays >= 5 },
  { id: "RESTED_ROUTINE", isMet: (s) => s.restfulGapCount >= 3 },
  { id: "LONG_HAUL_RETURN", isMet: (s) => s.maxGapDays >= 10 },
  { id: "MARATHON_PATIENCE", isMet: (s) => s.totalTrainingDays >= 30 && s.restfulGapCount >= 1 },
];

/**
 * Vraca ID-jeve Recovery Item-a ciji je uslov ispunjen u datom snapshot-u a
 * korisnik ih jos nema u `alreadyDiscovered` - isti princip kao
 * evaluateNewlyDiscoveredGuildItems/evaluateNewlyDiscoveredHiddenItems.
 */
export function evaluateNewlyDiscoveredRecoveryItems(
  snapshot: RecoveryItemStatsSnapshot,
  alreadyDiscovered: ReadonlySet<RecoveryItemId>,
): RecoveryItemId[] {
  return RECOVERY_ITEM_DEFINITIONS.filter(
    (definition) => !alreadyDiscovered.has(definition.id) && definition.isMet(snapshot),
  ).map((definition) => definition.id);
}
