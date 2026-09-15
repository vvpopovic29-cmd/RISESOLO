import { canTransitionQuestStatus } from "./quest";

describe("canTransitionQuestStatus", () => {
  it("dozvoljava validne prelaze", () => {
    expect(canTransitionQuestStatus("AVAILABLE", "IN_PROGRESS")).toBe(true);
    expect(canTransitionQuestStatus("AVAILABLE", "COMPLETED")).toBe(true);
    expect(canTransitionQuestStatus("IN_PROGRESS", "COMPLETED")).toBe(true);
    expect(canTransitionQuestStatus("AVAILABLE", "EXPIRED")).toBe(true);
  });

  it("odbija prelaze iz terminalnih stanja", () => {
    expect(canTransitionQuestStatus("COMPLETED", "IN_PROGRESS")).toBe(false);
    expect(canTransitionQuestStatus("EXPIRED", "COMPLETED")).toBe(false);
  });

  it("odbija povratak na AVAILABLE (quest se ne vraca unazad)", () => {
    expect(canTransitionQuestStatus("IN_PROGRESS", "AVAILABLE")).toBe(false);
  });
});
