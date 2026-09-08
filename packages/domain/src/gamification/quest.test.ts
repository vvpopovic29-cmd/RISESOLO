import { completeQuest } from "./quest";

describe("completeQuest", () => {
  it("dozvoljava prelaz iz active u completed", () => {
    const result = completeQuest("active");
    expect(result).toEqual({ ok: true, value: "completed" });
  });

  it("odbija ponovno zavrsavanje vec zavrsenog questa", () => {
    const result = completeQuest("completed");
    expect(result).toEqual({ ok: false, error: { type: "quest_already_completed" } });
  });
});
