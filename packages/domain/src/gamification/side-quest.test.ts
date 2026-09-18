import { SIDE_QUEST_KIND, SIDE_QUEST_TARGET, isSideQuestComplete } from "./side-quest";

describe("isSideQuestComplete", () => {
  it("nije zavrsen dok progres ne dostigne cilj", () => {
    expect(isSideQuestComplete(0, SIDE_QUEST_TARGET)).toBe(false);
  });

  it("zavrsen je kada progres dostigne ili predje cilj", () => {
    expect(isSideQuestComplete(SIDE_QUEST_TARGET, SIDE_QUEST_TARGET)).toBe(true);
    expect(isSideQuestComplete(SIDE_QUEST_TARGET + 1, SIDE_QUEST_TARGET)).toBe(true);
  });

  it("SIDE_QUEST_KIND je NEW_EXERCISE za MVP", () => {
    expect(SIDE_QUEST_KIND).toBe("NEW_EXERCISE");
  });
});
