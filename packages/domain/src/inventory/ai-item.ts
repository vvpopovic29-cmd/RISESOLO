/**
 * AI-Generated Items - peti izvor u Inventory sistemu. Katalog ID-jeva i
 * uslova (nivo) je fiksan i deterministican kao Hidden/Guild Item (isti
 * "derive, don't cache" princip za SAM USLOV), ali za razliku od svih
 * ostalih izvora, name/description NISU iz staticnog kataloga - generise ih
 * Claude (vidi apps/api/src/ai/ai.service.ts generateItemFlavor), isti
 * princip kao AI Quest. Zato se, JEDINO za ovaj izvor, generisan tekst MORA
 * perzistirati na InventoryItem redu (generatedName/generatedDescription
 * kolone) umesto da se izvodi iz katalog funkcije - ne moze se pozivati
 * Claude iznova na svaki GET. Pro-gating i provera da li je AI servis
 * konfigurisan zive u servisnom sloju (isti princip kao
 * QuestsService.getCurrentAiQuest) - besplatni korisnici i dani kada AI
 * servis nije dostupan NIKAD ne otkljucavaju ove predmete (graceful
 * degradation - katalog ostaje trajno "???", ne baca gresku).
 */

export const AI_ITEM_IDS = ["FIRST_SPARK", "RISING_PULSE", "STEADY_ASCENT", "PEAK_FOCUS", "LEGEND_IN_PROGRESS"] as const;
export type AiItemId = (typeof AI_ITEM_IDS)[number];

export interface AiItemStatsSnapshot {
  level: number;
}

export interface AiItemDefinition {
  id: AiItemId;
  levelRequirement: number;
}

export const AI_ITEM_DEFINITIONS: readonly AiItemDefinition[] = [
  { id: "FIRST_SPARK", levelRequirement: 3 },
  { id: "RISING_PULSE", levelRequirement: 6 },
  { id: "STEADY_ASCENT", levelRequirement: 10 },
  { id: "PEAK_FOCUS", levelRequirement: 15 },
  { id: "LEGEND_IN_PROGRESS", levelRequirement: 20 },
];

export function getAiItemDefinition(id: string): AiItemDefinition | undefined {
  return AI_ITEM_DEFINITIONS.find((item) => item.id === id);
}

/**
 * Vraca ID-jeve AI Item-a ciji je nivo dostignut u datom snapshot-u a
 * korisnik ih jos nema u `alreadyDiscovered` - isti princip kao
 * evaluateNewlyDiscoveredHiddenItems/evaluateNewlyDiscoveredGuildItems.
 * Servisni sloj poziva ovo SAMO nakon Pro/AI provere - ova funkcija sama ne
 * zna nista o pretplati, samo o nivou.
 */
export function evaluateNewlyDiscoveredAiItems(
  snapshot: AiItemStatsSnapshot,
  alreadyDiscovered: ReadonlySet<AiItemId>,
): AiItemId[] {
  return AI_ITEM_DEFINITIONS.filter(
    (definition) => !alreadyDiscovered.has(definition.id) && snapshot.level >= definition.levelRequirement,
  ).map((definition) => definition.id);
}
