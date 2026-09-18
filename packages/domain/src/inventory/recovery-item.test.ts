import {
  RECOVERY_ITEM_DEFINITIONS,
  type RecoveryItemId,
  type RecoveryItemStatsSnapshot,
  evaluateNewlyDiscoveredRecoveryItems,
} from "./recovery-item";

const EMPTY_SNAPSHOT: RecoveryItemStatsSnapshot = {
  maxGapDays: 0,
  restfulGapCount: 0,
  totalTrainingDays: 0,
};

describe("RECOVERY_ITEM_DEFINITIONS", () => {
  it("ima jedinstvene ID-jeve", () => {
    const ids = RECOVERY_ITEM_DEFINITIONS.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("evaluateNewlyDiscoveredRecoveryItems", () => {
  it("ne vraca nista za svez nalog (prazan snapshot)", () => {
    expect(evaluateNewlyDiscoveredRecoveryItems(EMPTY_SNAPSHOT, new Set())).toEqual([]);
  });

  it("otkriva FIRST_REST_DAY tek kada je najveci razmak izmedju treninga bar 2 dana", () => {
    const below: RecoveryItemStatsSnapshot = { ...EMPTY_SNAPSHOT, maxGapDays: 1 };
    expect(evaluateNewlyDiscoveredRecoveryItems(below, new Set())).not.toContain("FIRST_REST_DAY");
    const at: RecoveryItemStatsSnapshot = { ...EMPTY_SNAPSHOT, maxGapDays: 2 };
    expect(evaluateNewlyDiscoveredRecoveryItems(at, new Set())).toContain("FIRST_REST_DAY");
  });

  it("otkriva THE_COMEBACK tek pri razmaku od 5+ dana", () => {
    const below: RecoveryItemStatsSnapshot = { ...EMPTY_SNAPSHOT, maxGapDays: 4 };
    expect(evaluateNewlyDiscoveredRecoveryItems(below, new Set())).not.toContain("THE_COMEBACK");
    const at: RecoveryItemStatsSnapshot = { ...EMPTY_SNAPSHOT, maxGapDays: 5 };
    expect(evaluateNewlyDiscoveredRecoveryItems(at, new Set())).toContain("THE_COMEBACK");
  });

  it("otkriva RESTED_ROUTINE tek pri 3+ odmorenih razmaka", () => {
    const below: RecoveryItemStatsSnapshot = { ...EMPTY_SNAPSHOT, restfulGapCount: 2 };
    expect(evaluateNewlyDiscoveredRecoveryItems(below, new Set())).not.toContain("RESTED_ROUTINE");
    const at: RecoveryItemStatsSnapshot = { ...EMPTY_SNAPSHOT, restfulGapCount: 3 };
    expect(evaluateNewlyDiscoveredRecoveryItems(at, new Set())).toContain("RESTED_ROUTINE");
  });

  it("otkriva LONG_HAUL_RETURN tek pri razmaku od 10+ dana", () => {
    const below: RecoveryItemStatsSnapshot = { ...EMPTY_SNAPSHOT, maxGapDays: 9 };
    expect(evaluateNewlyDiscoveredRecoveryItems(below, new Set())).not.toContain("LONG_HAUL_RETURN");
    const at: RecoveryItemStatsSnapshot = { ...EMPTY_SNAPSHOT, maxGapDays: 10 };
    expect(evaluateNewlyDiscoveredRecoveryItems(at, new Set())).toContain("LONG_HAUL_RETURN");
  });

  it("otkriva MARATHON_PATIENCE samo kada su ISPUNJENA oba uslova (30+ dana treninga I bar 1 odmoreni razmak)", () => {
    const onlyDays: RecoveryItemStatsSnapshot = { ...EMPTY_SNAPSHOT, totalTrainingDays: 30, restfulGapCount: 0 };
    expect(evaluateNewlyDiscoveredRecoveryItems(onlyDays, new Set())).not.toContain("MARATHON_PATIENCE");
    const onlyRest: RecoveryItemStatsSnapshot = { ...EMPTY_SNAPSHOT, totalTrainingDays: 29, restfulGapCount: 1 };
    expect(evaluateNewlyDiscoveredRecoveryItems(onlyRest, new Set())).not.toContain("MARATHON_PATIENCE");
    const both: RecoveryItemStatsSnapshot = { ...EMPTY_SNAPSHOT, totalTrainingDays: 30, restfulGapCount: 1 };
    expect(evaluateNewlyDiscoveredRecoveryItems(both, new Set())).toContain("MARATHON_PATIENCE");
  });

  it("preskace vec otkrivene predmete", () => {
    const snapshot: RecoveryItemStatsSnapshot = { maxGapDays: 10, restfulGapCount: 3, totalTrainingDays: 30 };
    const alreadyDiscovered = new Set<RecoveryItemId>([
      "FIRST_REST_DAY",
      "THE_COMEBACK",
      "RESTED_ROUTINE",
      "LONG_HAUL_RETURN",
      "MARATHON_PATIENCE",
    ]);
    expect(evaluateNewlyDiscoveredRecoveryItems(snapshot, alreadyDiscovered)).toEqual([]);
  });
});
