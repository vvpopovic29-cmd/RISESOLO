import { AI_QUEST_KIND, AI_QUEST_TARGET } from "./ai-quest";

describe("AI Quest konstante", () => {
  it("AI_QUEST_KIND je AI_PERSONALIZED za MVP", () => {
    expect(AI_QUEST_KIND).toBe("AI_PERSONALIZED");
  });

  it("AI_QUEST_TARGET je 1 (bilo koji zavrsen trening tog dana)", () => {
    expect(AI_QUEST_TARGET).toBe(1);
  });
});
