import {
  AI_ITEM_DEFINITIONS,
  type AiItemId,
  type AiItemStatsSnapshot,
  evaluateNewlyDiscoveredAiItems,
  getAiItemDefinition,
} from "./ai-item";

describe("AI_ITEM_DEFINITIONS", () => {
  it("ima jedinstvene ID-jeve", () => {
    const ids = AI_ITEM_DEFINITIONS.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("nivo uslova strogo raste po redosledu kataloga", () => {
    for (let i = 1; i < AI_ITEM_DEFINITIONS.length; i += 1) {
      expect(AI_ITEM_DEFINITIONS[i].levelRequirement).toBeGreaterThan(AI_ITEM_DEFINITIONS[i - 1].levelRequirement);
    }
  });
});

describe("getAiItemDefinition", () => {
  it("vraca definiciju za poznat ID", () => {
    expect(getAiItemDefinition("FIRST_SPARK")?.levelRequirement).toBe(3);
  });

  it("vraca undefined za nepoznat ID", () => {
    expect(getAiItemDefinition("NEPOSTOJECI")).toBeUndefined();
  });
});

describe("evaluateNewlyDiscoveredAiItems", () => {
  it("ne vraca nista za svez nalog (nivo 1)", () => {
    const snapshot: AiItemStatsSnapshot = { level: 1 };
    expect(evaluateNewlyDiscoveredAiItems(snapshot, new Set())).toEqual([]);
  });

  it("otkriva FIRST_SPARK tek na nivou 3", () => {
    const below: AiItemStatsSnapshot = { level: 2 };
    expect(evaluateNewlyDiscoveredAiItems(below, new Set())).not.toContain("FIRST_SPARK");
    const at: AiItemStatsSnapshot = { level: 3 };
    expect(evaluateNewlyDiscoveredAiItems(at, new Set())).toContain("FIRST_SPARK");
  });

  it("otkriva vise predmeta odjednom kada nivo skoci preko vise pragova", () => {
    const snapshot: AiItemStatsSnapshot = { level: 12 };
    const newlyDiscovered = evaluateNewlyDiscoveredAiItems(snapshot, new Set());
    expect(newlyDiscovered).toEqual(
      expect.arrayContaining(["FIRST_SPARK", "RISING_PULSE", "STEADY_ASCENT"]),
    );
    expect(newlyDiscovered).not.toContain("PEAK_FOCUS");
    expect(newlyDiscovered).not.toContain("LEGEND_IN_PROGRESS");
  });

  it("otkriva LEGEND_IN_PROGRESS tek na nivou 20", () => {
    const below: AiItemStatsSnapshot = { level: 19 };
    expect(evaluateNewlyDiscoveredAiItems(below, new Set())).not.toContain("LEGEND_IN_PROGRESS");
    const at: AiItemStatsSnapshot = { level: 20 };
    expect(evaluateNewlyDiscoveredAiItems(at, new Set())).toContain("LEGEND_IN_PROGRESS");
  });

  it("preskace vec otkrivene predmete", () => {
    const snapshot: AiItemStatsSnapshot = { level: 20 };
    const alreadyDiscovered = new Set<AiItemId>(["FIRST_SPARK", "RISING_PULSE", "STEADY_ASCENT", "PEAK_FOCUS", "LEGEND_IN_PROGRESS"]);
    expect(evaluateNewlyDiscoveredAiItems(snapshot, alreadyDiscovered)).toEqual([]);
  });
});
