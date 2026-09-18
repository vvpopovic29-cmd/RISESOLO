import {
  HIDDEN_ITEM_DEFINITIONS,
  type HiddenItemId,
  type HiddenItemStatsSnapshot,
  evaluateNewlyDiscoveredHiddenItems,
} from "./hidden-item";

const EMPTY_SNAPSHOT: HiddenItemStatsSnapshot = {
  hasMidnightWorkout: false,
  maxSingleSessionReps: 0,
  minStatValue: 1,
  maxStatValue: 1,
  coins: 0,
  currentStreak: 0,
  penaltyQuestsEverApplied: 0,
};

describe("HIDDEN_ITEM_DEFINITIONS", () => {
  it("ima jedinstvene ID-jeve", () => {
    const ids = HIDDEN_ITEM_DEFINITIONS.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("evaluateNewlyDiscoveredHiddenItems", () => {
  it("ne vraca nista za prazan snapshot", () => {
    expect(evaluateNewlyDiscoveredHiddenItems(EMPTY_SNAPSHOT, new Set())).toEqual([]);
  });

  it("otkriva MIDNIGHT_WARRIOR samo kada je trening zavrsen izmedju ponoci i 4h", () => {
    expect(evaluateNewlyDiscoveredHiddenItems(EMPTY_SNAPSHOT, new Set())).not.toContain("MIDNIGHT_WARRIOR");
    const snapshot: HiddenItemStatsSnapshot = { ...EMPTY_SNAPSHOT, hasMidnightWorkout: true };
    expect(evaluateNewlyDiscoveredHiddenItems(snapshot, new Set())).toContain("MIDNIGHT_WARRIOR");
  });

  it("otkriva CENTURY_CLUB tek pri 100+ ponavljanja u jednoj sesiji", () => {
    const below: HiddenItemStatsSnapshot = { ...EMPTY_SNAPSHOT, maxSingleSessionReps: 99 };
    expect(evaluateNewlyDiscoveredHiddenItems(below, new Set())).not.toContain("CENTURY_CLUB");
    const at: HiddenItemStatsSnapshot = { ...EMPTY_SNAPSHOT, maxSingleSessionReps: 100 };
    expect(evaluateNewlyDiscoveredHiddenItems(at, new Set())).toContain("CENTURY_CLUB");
  });

  it("otkriva BALANCED_WARRIOR samo kada su svi atributi >= 15 i medjusobno blizu", () => {
    const lowButEven: HiddenItemStatsSnapshot = { ...EMPTY_SNAPSHOT, minStatValue: 10, maxStatValue: 10 };
    expect(evaluateNewlyDiscoveredHiddenItems(lowButEven, new Set())).not.toContain("BALANCED_WARRIOR");
    const highButSpread: HiddenItemStatsSnapshot = { ...EMPTY_SNAPSHOT, minStatValue: 15, maxStatValue: 25 };
    expect(evaluateNewlyDiscoveredHiddenItems(highButSpread, new Set())).not.toContain("BALANCED_WARRIOR");
    const balanced: HiddenItemStatsSnapshot = { ...EMPTY_SNAPSHOT, minStatValue: 16, maxStatValue: 17 };
    expect(evaluateNewlyDiscoveredHiddenItems(balanced, new Set())).toContain("BALANCED_WARRIOR");
  });

  it("otkriva COIN_HOARDER tek pri 5000+ coins-a", () => {
    const below: HiddenItemStatsSnapshot = { ...EMPTY_SNAPSHOT, coins: 4999 };
    expect(evaluateNewlyDiscoveredHiddenItems(below, new Set())).not.toContain("COIN_HOARDER");
    const at: HiddenItemStatsSnapshot = { ...EMPTY_SNAPSHOT, coins: 5000 };
    expect(evaluateNewlyDiscoveredHiddenItems(at, new Set())).toContain("COIN_HOARDER");
  });

  it("otkriva UNBROKEN_DISCIPLINE samo uz 7+ dana niza I nula ikad primenjenih kazni", () => {
    const streakButPenalized: HiddenItemStatsSnapshot = {
      ...EMPTY_SNAPSHOT,
      currentStreak: 10,
      penaltyQuestsEverApplied: 1,
    };
    expect(evaluateNewlyDiscoveredHiddenItems(streakButPenalized, new Set())).not.toContain("UNBROKEN_DISCIPLINE");
    const cleanButShort: HiddenItemStatsSnapshot = { ...EMPTY_SNAPSHOT, currentStreak: 6, penaltyQuestsEverApplied: 0 };
    expect(evaluateNewlyDiscoveredHiddenItems(cleanButShort, new Set())).not.toContain("UNBROKEN_DISCIPLINE");
    const qualifies: HiddenItemStatsSnapshot = { ...EMPTY_SNAPSHOT, currentStreak: 7, penaltyQuestsEverApplied: 0 };
    expect(evaluateNewlyDiscoveredHiddenItems(qualifies, new Set())).toContain("UNBROKEN_DISCIPLINE");
  });

  it("preskace vec otkrivene predmete", () => {
    const snapshot: HiddenItemStatsSnapshot = { ...EMPTY_SNAPSHOT, coins: 5000 };
    const alreadyDiscovered = new Set<HiddenItemId>(["COIN_HOARDER"]);
    expect(evaluateNewlyDiscoveredHiddenItems(snapshot, alreadyDiscovered)).toEqual([]);
  });
});
