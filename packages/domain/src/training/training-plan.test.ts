import { generateWeeklySchedule } from "./training-plan";

describe("generateWeeklySchedule", () => {
  it("baca gresku za daysPerWeek van opsega [1,7] ili necelobrojan", () => {
    expect(() => generateWeeklySchedule("full_body", 0)).toThrow(RangeError);
    expect(() => generateWeeklySchedule("full_body", 8)).toThrow(RangeError);
    expect(() => generateWeeklySchedule("full_body", 3.5)).toThrow(RangeError);
  });

  it("vraca 7 treninga za full_body kada je daysPerWeek=7 (svaki dan trening)", () => {
    const schedule = generateWeeklySchedule("full_body", 7);
    expect(schedule).toHaveLength(7);
    expect(schedule.every((day) => day === "full_body")).toBe(true);
  });

  it("ravnomerno rasporedjuje trening dane bez susednih dana za push_pull_legs 3x/nedelju", () => {
    const schedule = generateWeeklySchedule("push_pull_legs", 3);

    expect(schedule).toHaveLength(7);
    expect(schedule.filter((day) => day !== "rest")).toHaveLength(3);

    // Nema dva uzastopna trening dana (rest je ravnomerno umetnut).
    for (let i = 0; i < schedule.length - 1; i++) {
      if (schedule[i] !== "rest") {
        expect(schedule[i + 1]).toBe("rest");
      }
    }
  });

  it("rotira kroz push_pull_legs template redom (push, pull, legs, push, ...)", () => {
    const schedule = generateWeeklySchedule("push_pull_legs", 3);
    const trainingDays = schedule.filter((day) => day !== "rest");

    expect(trainingDays).toEqual(["push", "pull", "legs"]);
  });

  it("rotira kroz upper_lower template kada ima vise trening dana nego stavki u template-u", () => {
    const schedule = generateWeeklySchedule("upper_lower", 4);
    const trainingDays = schedule.filter((day) => day !== "rest");

    expect(trainingDays).toHaveLength(4);
    expect(trainingDays).toEqual(["upper", "lower", "upper", "lower"]);
  });

  it("vraca tacno jedan trening dan za daysPerWeek=1", () => {
    const schedule = generateWeeklySchedule("full_body", 1);

    expect(schedule.filter((day) => day !== "rest")).toHaveLength(1);
  });

  it("je deterministicna - isti ulaz uvek daje isti raspored", () => {
    const first = generateWeeklySchedule("push_pull_legs", 5);
    const second = generateWeeklySchedule("push_pull_legs", 5);

    expect(first).toEqual(second);
  });
});
