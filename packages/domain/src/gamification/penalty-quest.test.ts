import { PENALTY_QUEST_KIND, PENALTY_QUEST_TARGET_SESSIONS, isPenaltyQuestComplete } from "./penalty-quest";

describe("isPenaltyQuestComplete", () => {
  it("nije zavrsen dok broj treninga tog dana ne dostigne cilj", () => {
    expect(isPenaltyQuestComplete(0, PENALTY_QUEST_TARGET_SESSIONS)).toBe(false);
    expect(isPenaltyQuestComplete(PENALTY_QUEST_TARGET_SESSIONS - 1, PENALTY_QUEST_TARGET_SESSIONS)).toBe(false);
  });

  it("zavrsen je kada broj treninga dostigne ili predje cilj", () => {
    expect(isPenaltyQuestComplete(PENALTY_QUEST_TARGET_SESSIONS, PENALTY_QUEST_TARGET_SESSIONS)).toBe(true);
    expect(isPenaltyQuestComplete(PENALTY_QUEST_TARGET_SESSIONS + 1, PENALTY_QUEST_TARGET_SESSIONS)).toBe(true);
  });

  it("PENALTY_QUEST_KIND je REDEMPTION_WORKOUT za MVP", () => {
    expect(PENALTY_QUEST_KIND).toBe("REDEMPTION_WORKOUT");
  });
});
