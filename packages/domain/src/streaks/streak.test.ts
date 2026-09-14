import { computeDisplayedStreak, createInitialStreak, updateStreakForActivity } from "./streak";

describe("createInitialStreak", () => {
  it("pocinje od 0, bez poslednje aktivnosti", () => {
    expect(createInitialStreak()).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
    });
  });
});

describe("updateStreakForActivity", () => {
  it("prva aktivnost postavlja streak na 1", () => {
    const result = updateStreakForActivity(createInitialStreak(), "2026-09-14");
    expect(result).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: "2026-09-14",
    });
  });

  it("aktivnost narednog dana (juce -> danas) povecava streak", () => {
    const day1 = updateStreakForActivity(createInitialStreak(), "2026-09-14");
    const day2 = updateStreakForActivity(day1, "2026-09-15");
    expect(day2.currentStreak).toBe(2);
    expect(day2.longestStreak).toBe(2);
  });

  it("druga aktivnost ISTOG dana ne duplira streak (idempotentno)", () => {
    const day1 = updateStreakForActivity(createInitialStreak(), "2026-09-14");
    const stillDay1 = updateStreakForActivity(day1, "2026-09-14");
    expect(stillDay1).toEqual(day1);
  });

  it("preskoceni dan resetuje streak na 1 (ne na 0 + 1 odvojeno)", () => {
    const day1 = updateStreakForActivity(createInitialStreak(), "2026-09-14");
    const day2 = updateStreakForActivity(day1, "2026-09-15");
    // preskace 2026-09-16, sledeca aktivnost je 2026-09-17
    const afterGap = updateStreakForActivity(day2, "2026-09-17");
    expect(afterGap.currentStreak).toBe(1);
  });

  it("longestStreak pamti istorijski maksimum i posle reseta", () => {
    const day1 = updateStreakForActivity(createInitialStreak(), "2026-09-14");
    const day2 = updateStreakForActivity(day1, "2026-09-15");
    const day3 = updateStreakForActivity(day2, "2026-09-16"); // currentStreak = 3
    const afterGap = updateStreakForActivity(day3, "2026-09-20"); // reset na 1
    expect(afterGap.currentStreak).toBe(1);
    expect(afterGap.longestStreak).toBe(3);
  });

  it("baca gresku za nevalidan datum", () => {
    expect(() => updateStreakForActivity(createInitialStreak(), "not-a-date")).toThrow(RangeError);
  });
});

describe("computeDisplayedStreak", () => {
  it("vraca 0 ako nikad nije bilo aktivnosti", () => {
    expect(computeDisplayedStreak(createInitialStreak(), "2026-09-14")).toBe(0);
  });

  it("vraca currentStreak ako je poslednja aktivnost danas ili juce", () => {
    const state = updateStreakForActivity(createInitialStreak(), "2026-09-14");
    expect(computeDisplayedStreak(state, "2026-09-14")).toBe(1);
    expect(computeDisplayedStreak(state, "2026-09-15")).toBe(1);
  });

  it("vraca 0 ako je poslednja aktivnost bila pre 2+ dana (streak je logicki mrtav)", () => {
    const state = updateStreakForActivity(createInitialStreak(), "2026-09-14");
    expect(computeDisplayedStreak(state, "2026-09-16")).toBe(0);
    expect(computeDisplayedStreak(state, "2026-10-01")).toBe(0);
  });

  it("ne menja sacuvano stanje (cisto citanje)", () => {
    const state = updateStreakForActivity(createInitialStreak(), "2026-09-14");
    computeDisplayedStreak(state, "2026-10-01");
    expect(state.currentStreak).toBe(1);
  });
});
