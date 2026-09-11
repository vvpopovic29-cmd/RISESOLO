import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type {
  MealLogResponse,
  NutritionDailySummary,
  WaterLogResponse,
} from "@risesolo/validation";
import { NutritionScreen } from "./NutritionScreen";
import { useApiClient } from "../api/use-api-client";

jest.mock("../api/use-api-client", () => ({
  useApiClient: jest.fn(),
}));

const mockedUseApiClient = useApiClient as jest.Mock;

const baseSummary: NutritionDailySummary = {
  date: "2026-01-01",
  totalCalories: 500,
  totalProteinG: 30,
  totalCarbsG: 40,
  totalFatG: 15,
  totalWaterMl: 250,
  targets: {
    calorieTarget: 2000,
    proteinTargetG: 150,
    carbTargetG: 200,
    fatTargetG: 60,
    waterTargetMl: 2500,
  },
  meals: [],
  waterLogs: [],
  dailyGoalMet: false,
  bonusXpGranted: false,
};

const mealLogResult: MealLogResponse = {
  id: "00000000-0000-0000-0000-000000000030",
  name: "Piletina i pirinac",
  calories: 600,
  proteinG: 40,
  carbsG: 60,
  fatG: 10,
  loggedAt: new Date().toISOString(),
};

const waterLogResult: WaterLogResponse = {
  id: "00000000-0000-0000-0000-000000000031",
  amountMl: 500,
  loggedAt: new Date().toISOString(),
};

describe("NutritionScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("prikazuje dnevni pregled kada zahtev uspe", async () => {
    mockedUseApiClient.mockReturnValue({
      getNutritionSummary: () => Promise.resolve(baseSummary),
    });

    await render(<NutritionScreen />);

    await waitFor(() => expect(screen.getByTestId("nutrition-summary")).toBeTruthy());
    expect(screen.getByText("Kalorije: 500 / 2000")).toBeTruthy();
  }, 15000);

  it("dodaje obrok i osvezava pregled", async () => {
    const logMeal = jest.fn().mockResolvedValue(mealLogResult);
    const getNutritionSummary = jest.fn().mockResolvedValue(baseSummary);
    mockedUseApiClient.mockReturnValue({
      getNutritionSummary,
      logMeal,
    });

    await render(<NutritionScreen />);

    await waitFor(() => expect(screen.getByTestId("nutrition-summary")).toBeTruthy());

    await fireEvent.changeText(
      screen.getByTestId("nutrition-meal-name-input"),
      "Piletina i pirinac",
    );
    await fireEvent.changeText(screen.getByTestId("nutrition-meal-calories-input"), "600");
    await fireEvent.changeText(screen.getByTestId("nutrition-meal-protein-input"), "40");
    await fireEvent.changeText(screen.getByTestId("nutrition-meal-carbs-input"), "60");
    await fireEvent.changeText(screen.getByTestId("nutrition-meal-fat-input"), "10");
    await fireEvent.press(screen.getByTestId("nutrition-meal-submit"));

    await waitFor(() =>
      expect(logMeal).toHaveBeenCalledWith({
        name: "Piletina i pirinac",
        calories: 600,
        proteinG: 40,
        carbsG: 60,
        fatG: 10,
      }),
    );
    await waitFor(() => expect(getNutritionSummary).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("nutrition-meal-name-input").props.value).toBe("");
  });

  it("dodaje vodu i osvezava pregled", async () => {
    const logWater = jest.fn().mockResolvedValue(waterLogResult);
    const getNutritionSummary = jest.fn().mockResolvedValue(baseSummary);
    mockedUseApiClient.mockReturnValue({
      getNutritionSummary,
      logWater,
    });

    await render(<NutritionScreen />);

    await waitFor(() => expect(screen.getByTestId("nutrition-summary")).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId("nutrition-water-amount-input"), "500");
    await fireEvent.press(screen.getByTestId("nutrition-water-submit"));

    await waitFor(() => expect(logWater).toHaveBeenCalledWith({ amountMl: 500 }));
    await waitFor(() => expect(getNutritionSummary).toHaveBeenCalledTimes(2));
  });

  it("prikazuje gresku kada dodavanje obroka ne uspe", async () => {
    const logMeal = jest.fn().mockRejectedValue(new Error("network"));
    mockedUseApiClient.mockReturnValue({
      getNutritionSummary: () => Promise.resolve(baseSummary),
      logMeal,
    });

    await render(<NutritionScreen />);

    await waitFor(() => expect(screen.getByTestId("nutrition-summary")).toBeTruthy());
    await fireEvent.changeText(screen.getByTestId("nutrition-meal-name-input"), "Obrok");
    await fireEvent.changeText(screen.getByTestId("nutrition-meal-calories-input"), "300");
    await fireEvent.press(screen.getByTestId("nutrition-meal-submit"));

    await waitFor(() => expect(screen.getByTestId("nutrition-meal-error")).toBeTruthy());
  });

  it("izmenjuje ciljeve", async () => {
    const updateNutritionTargets = jest.fn().mockResolvedValue({
      ...baseSummary.targets,
      calorieTarget: 2200,
    });
    const getNutritionSummary = jest.fn().mockResolvedValue(baseSummary);
    mockedUseApiClient.mockReturnValue({
      getNutritionSummary,
      updateNutritionTargets,
    });

    await render(<NutritionScreen />);

    await waitFor(() => expect(screen.getByTestId("nutrition-summary")).toBeTruthy());
    await fireEvent.press(screen.getByTestId("nutrition-targets-edit-toggle"));

    await waitFor(() => expect(screen.getByTestId("nutrition-targets-calorie-input")).toBeTruthy());
    expect(screen.getByTestId("nutrition-targets-calorie-input").props.value).toBe("2000");

    await fireEvent.changeText(screen.getByTestId("nutrition-targets-calorie-input"), "2200");
    await fireEvent.press(screen.getByTestId("nutrition-targets-submit"));

    await waitFor(() =>
      expect(updateNutritionTargets).toHaveBeenCalledWith({
        calorieTarget: 2200,
        proteinTargetG: 150,
        carbTargetG: 200,
        fatTargetG: 60,
        waterTargetMl: 2500,
      }),
    );
    await waitFor(() => expect(getNutritionSummary).toHaveBeenCalledTimes(2));
  });

  it("prikazuje bonus poruku kada je dnevni cilj ispunjen i bonus XP dodeljen", async () => {
    mockedUseApiClient.mockReturnValue({
      getNutritionSummary: () =>
        Promise.resolve({ ...baseSummary, dailyGoalMet: true, bonusXpGranted: true }),
    });

    await render(<NutritionScreen />);

    await waitFor(() => expect(screen.getByTestId("nutrition-daily-bonus")).toBeTruthy());
  });

  it("prikazuje poruku o ispunjenom cilju bez pominjanja bonusa kada bonus jos nije dodeljen", async () => {
    mockedUseApiClient.mockReturnValue({
      getNutritionSummary: () =>
        Promise.resolve({ ...baseSummary, dailyGoalMet: true, bonusXpGranted: false }),
    });

    await render(<NutritionScreen />);

    await waitFor(() => expect(screen.getByTestId("nutrition-daily-goal-met")).toBeTruthy());
  });
});
