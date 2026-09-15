import { BOSS_QUEST_TARGET_SESSIONS, isBossQuestComplete } from "./boss-quest";

describe("isBossQuestComplete", () => {
  it("nije zavrsen dok broj sesija ne dostigne cilj", () => {
    expect(isBossQuestComplete(0, BOSS_QUEST_TARGET_SESSIONS)).toBe(false);
    expect(isBossQuestComplete(BOSS_QUEST_TARGET_SESSIONS - 1, BOSS_QUEST_TARGET_SESSIONS)).toBe(false);
  });

  it("zavrsen je kada broj sesija dostigne ili predje cilj", () => {
    expect(isBossQuestComplete(BOSS_QUEST_TARGET_SESSIONS, BOSS_QUEST_TARGET_SESSIONS)).toBe(true);
    expect(isBossQuestComplete(BOSS_QUEST_TARGET_SESSIONS + 2, BOSS_QUEST_TARGET_SESSIONS)).toBe(true);
  });
});
