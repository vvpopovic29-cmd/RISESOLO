import { sumDailyMacros, type NutritionMacros } from "./macros";

function entry(overrides: Partial<NutritionMacros>): NutritionMacros {
  return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, ...overrides };
}

describe("sumDailyMacros", () => {
  it("vraca sve nule za praznu listu unosa", () => {
    expect(sumDailyMacros([])).toEqual({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });

  it("sabira makronutrijente vise unosa", () => {
    const entries = [
      entry({ calories: 350, proteinG: 20, carbsG: 40, fatG: 10 }),
      entry({ calories: 600, proteinG: 35, carbsG: 60, fatG: 20 }),
      entry({ calories: 150, proteinG: 5, carbsG: 10, fatG: 8 }),
    ];

    expect(sumDailyMacros(entries)).toEqual({ calories: 1100, proteinG: 60, carbsG: 110, fatG: 38 });
  });

  it("ne mutira ulazne unose", () => {
    const entries = [entry({ calories: 100 })];
    const snapshot = { ...entries[0] };

    sumDailyMacros(entries);

    expect(entries[0]).toEqual(snapshot);
  });
});
