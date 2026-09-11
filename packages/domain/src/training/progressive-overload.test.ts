import {
  computeProgressTrend,
  detectStagnation,
  estimated1Rm,
  topEstimated1Rm,
} from "./progressive-overload";

describe("estimated1Rm", () => {
  it("vraca samu tezinu za 1 ponavljanje", () => {
    expect(estimated1Rm(100, 1)).toBe(100);
  });

  it("racuna Epley procenu za vise ponavljanja", () => {
    // 100 * (1 + 8/30) = 126.666...
    expect(estimated1Rm(100, 8)).toBeCloseTo(126.6667, 3);
  });

  it("baca gresku za nevalidnu tezinu ili ponavljanja", () => {
    expect(() => estimated1Rm(-10, 5)).toThrow(RangeError);
    expect(() => estimated1Rm(100, 0)).toThrow(RangeError);
    expect(() => estimated1Rm(100, 1.5)).toThrow(RangeError);
  });
});

describe("topEstimated1Rm", () => {
  it("vraca najvecu procenjenu 1RM medju serijama", () => {
    // 60x8 -> 76, 65x5 -> 75.83, 50x12 -> 70: najveca je 60x8.
    const sets = [
      { weightKg: 60, reps: 8 },
      { weightKg: 65, reps: 5 },
      { weightKg: 50, reps: 12 },
    ];
    expect(topEstimated1Rm(sets)).toBeCloseTo(estimated1Rm(60, 8), 6);
  });

  it("baca gresku za prazan niz serija", () => {
    expect(() => topEstimated1Rm([])).toThrow(RangeError);
  });
});

describe("computeProgressTrend", () => {
  it("vraca insufficient_data sa manje od 2 sesije", () => {
    expect(computeProgressTrend([])).toBe("insufficient_data");
    expect(computeProgressTrend([[{ weightKg: 60, reps: 8 }]])).toBe("insufficient_data");
  });

  it("vraca up kada je najnovija sesija jaca od prethodne", () => {
    const sessions = [[{ weightKg: 60, reps: 8 }], [{ weightKg: 65, reps: 8 }]];
    expect(computeProgressTrend(sessions)).toBe("up");
  });

  it("vraca down kada je najnovija sesija slabija od prethodne", () => {
    const sessions = [[{ weightKg: 65, reps: 8 }], [{ weightKg: 60, reps: 8 }]];
    expect(computeProgressTrend(sessions)).toBe("down");
  });

  it("vraca flat kada su sesije identicne", () => {
    const sessions = [[{ weightKg: 60, reps: 8 }], [{ weightKg: 60, reps: 8 }]];
    expect(computeProgressTrend(sessions)).toBe("flat");
  });

  it("koristi samo poslednje dve sesije kada ih ima vise", () => {
    const sessions = [
      [{ weightKg: 40, reps: 8 }],
      [{ weightKg: 100, reps: 8 }], // najjaca sesija, ali nije jedna od poslednje dve
      [{ weightKg: 60, reps: 8 }],
      [{ weightKg: 65, reps: 8 }],
    ];
    expect(computeProgressTrend(sessions)).toBe("up");
  });
});

describe("detectStagnation", () => {
  it("vraca insufficient_data kada ima manje sesija nego windowSize (podrazumevano 3)", () => {
    expect(detectStagnation([])).toBe("insufficient_data");
    expect(detectStagnation([[{ weightKg: 60, reps: 8 }], [{ weightKg: 65, reps: 8 }]])).toBe(
      "insufficient_data",
    );
  });

  it("vraca progressing kada svaka sesija u prozoru raste u odnosu na prethodnu", () => {
    const sessions = [
      [{ weightKg: 60, reps: 8 }],
      [{ weightKg: 65, reps: 8 }],
      [{ weightKg: 70, reps: 8 }],
    ];
    expect(detectStagnation(sessions)).toBe("progressing");
  });

  it("vraca regressing kada svaka sesija u prozoru opada u odnosu na prethodnu", () => {
    const sessions = [
      [{ weightKg: 70, reps: 8 }],
      [{ weightKg: 65, reps: 8 }],
      [{ weightKg: 60, reps: 8 }],
    ];
    expect(detectStagnation(sessions)).toBe("regressing");
  });

  it("vraca stagnating kada su sve sesije u prozoru identicne", () => {
    const sessions = [
      [{ weightKg: 60, reps: 8 }],
      [{ weightKg: 60, reps: 8 }],
      [{ weightKg: 60, reps: 8 }],
    ];
    expect(detectStagnation(sessions)).toBe("stagnating");
  });

  it("vraca stagnating kada su signali u prozoru mesoviti (i rast i pad)", () => {
    const sessions = [
      [{ weightKg: 60, reps: 8 }],
      [{ weightKg: 70, reps: 8 }],
      [{ weightKg: 65, reps: 8 }],
    ];
    expect(detectStagnation(sessions)).toBe("stagnating");
  });

  it("koristi samo poslednjih windowSize sesija kada ih ima vise", () => {
    const sessions = [
      [{ weightKg: 100, reps: 8 }], // najjaca sesija, ali van prozora od 3
      [{ weightKg: 60, reps: 8 }],
      [{ weightKg: 65, reps: 8 }],
      [{ weightKg: 70, reps: 8 }],
    ];
    expect(detectStagnation(sessions)).toBe("progressing");
  });

  it("prihvata prilagodjen windowSize", () => {
    const sessions = [[{ weightKg: 60, reps: 8 }], [{ weightKg: 65, reps: 8 }]];
    expect(detectStagnation(sessions, 2)).toBe("progressing");
  });
});
