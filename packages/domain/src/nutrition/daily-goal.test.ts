import { isNutritionDailyGoalMet, type NutritionDailyTotals } from "./daily-goal";

const noTargets = {
  calorieTarget: null,
  proteinTargetG: null,
  carbTargetG: null,
  fatTargetG: null,
  waterTargetMl: null,
};

const zeroTotals: NutritionDailyTotals = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  waterMl: 0,
};

describe("isNutritionDailyGoalMet", () => {
  it("vraca false kada igrac nema nijedan postavljen cilj", () => {
    expect(isNutritionDailyGoalMet(zeroTotals, noTargets)).toBe(false);
  });

  it("vraca true kada su sve postavljene mete ispunjene", () => {
    const totals: NutritionDailyTotals = {
      calories: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 60,
      waterMl: 2500,
    };
    const targets = {
      calorieTarget: 2000,
      proteinTargetG: 140,
      carbTargetG: 180,
      fatTargetG: 55,
      waterTargetMl: 2000,
    };
    expect(isNutritionDailyGoalMet(totals, targets)).toBe(true);
  });

  it("kalorije u okviru +/- 10% tolerancije se racunaju kao ispunjene", () => {
    const targets = { ...noTargets, calorieTarget: 2000 };
    expect(isNutritionDailyGoalMet({ ...zeroTotals, calories: 1800 }, targets)).toBe(true);
    expect(isNutritionDailyGoalMet({ ...zeroTotals, calories: 2200 }, targets)).toBe(true);
    expect(isNutritionDailyGoalMet({ ...zeroTotals, calories: 1799 }, targets)).toBe(false);
    expect(isNutritionDailyGoalMet({ ...zeroTotals, calories: 2201 }, targets)).toBe(false);
  });

  it("protein/carbs/fat/voda su minimumi - premasivanje i dalje ispunjava cilj", () => {
    const targets = { ...noTargets, proteinTargetG: 100 };
    expect(isNutritionDailyGoalMet({ ...zeroTotals, proteinG: 100 }, targets)).toBe(true);
    expect(isNutritionDailyGoalMet({ ...zeroTotals, proteinG: 500 }, targets)).toBe(true);
    expect(isNutritionDailyGoalMet({ ...zeroTotals, proteinG: 99 }, targets)).toBe(false);
  });

  it("nepostavljen cilj (null) se ignorise pri proveri", () => {
    const targets = { ...noTargets, waterTargetMl: 2000 };
    expect(isNutritionDailyGoalMet({ ...zeroTotals, waterMl: 2000 }, targets)).toBe(true);
  });

  it("jedan neispunjen cilj je dovoljan da ceo dan ne racuna se kao ispunjen", () => {
    const targets = {
      calorieTarget: 2000,
      proteinTargetG: 140,
      carbTargetG: null,
      fatTargetG: null,
      waterTargetMl: null,
    };
    const totals: NutritionDailyTotals = {
      calories: 2000,
      proteinG: 100,
      carbsG: 0,
      fatG: 0,
      waterMl: 0,
    };
    expect(isNutritionDailyGoalMet(totals, targets)).toBe(false);
  });
});
