import { isQuestCompletable } from "./quest";

describe("isQuestCompletable", () => {
  it("vraca true kada je quest aktivan i progres dostigao cilj", () => {
    expect(isQuestCompletable({ status: "active", progressCount: 4, targetCount: 4 })).toBe(true);
    expect(isQuestCompletable({ status: "active", progressCount: 5, targetCount: 4 })).toBe(true);
  });

  it("vraca false kada progres jos nije dostigao cilj", () => {
    expect(isQuestCompletable({ status: "active", progressCount: 2, targetCount: 4 })).toBe(false);
  });

  it("vraca false za quest koji nije aktivan cak i ako je progres dostigao cilj", () => {
    expect(isQuestCompletable({ status: "completed", progressCount: 4, targetCount: 4 })).toBe(
      false,
    );
    expect(isQuestCompletable({ status: "failed", progressCount: 4, targetCount: 4 })).toBe(false);
    expect(isQuestCompletable({ status: "expired", progressCount: 4, targetCount: 4 })).toBe(false);
  });
});
