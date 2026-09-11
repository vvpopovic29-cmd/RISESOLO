import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ExerciseResponse, LogWorkoutResponse } from "@risesolo/validation";
import { WorkoutLogScreen } from "./WorkoutLogScreen";
import { useApiClient } from "../api/use-api-client";

jest.mock("../api/use-api-client", () => ({
  useApiClient: jest.fn(),
}));

const mockedUseApiClient = useApiClient as jest.Mock;

const squat: ExerciseResponse = {
  id: "00000000-0000-0000-0000-000000000010",
  name: "Cucanj",
  muscleGroups: ["legs"],
  equipment: "barbell",
  difficulty: "D",
  instructions: null,
  alternativeExerciseIds: [],
};

const logWorkoutResult: LogWorkoutResponse = {
  workoutId: "00000000-0000-0000-0000-000000000020",
  personalRecordsCount: 1,
  newPersonalRecords: [{ exerciseId: squat.id, weightKg: 100, reps: 5 }],
  player: {
    id: "00000000-0000-0000-0000-000000000001",
    displayName: "Vukasin",
    level: 3,
    xp: 450,
    xpToNextLevel: 500,
    statPointsAvailable: 0,
    rank: "D",
    class: null,
    coins: 120,
    hp: 100,
    strength: 4,
    agility: 3,
    endurance: 3,
    vitality: 2,
    intelligence: 1,
    currentStreak: 5,
    longestStreak: 5,
    lastActivityDate: "2026-01-01",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

describe("WorkoutLogScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("dodaje set i salje trening kada su podaci validni", async () => {
    const logWorkout = jest.fn().mockResolvedValue(logWorkoutResult);
    const evaluateAchievements = jest.fn().mockResolvedValue([]);
    mockedUseApiClient.mockReturnValue({
      listExercises: () => Promise.resolve([squat]),
      logWorkout,
      evaluateAchievements,
    });

    await render(<WorkoutLogScreen />);

    await waitFor(() =>
      expect(screen.getByTestId(`workout-log-exercise-${squat.id}`)).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId(`workout-log-exercise-${squat.id}`));

    await fireEvent.changeText(screen.getByTestId("workout-log-reps-input"), "5");
    await fireEvent.changeText(screen.getByTestId("workout-log-weight-input"), "100");
    await fireEvent.press(screen.getByTestId("workout-log-add-set"));

    await waitFor(() => expect(screen.getByTestId("workout-log-set-0")).toBeTruthy());
    expect(screen.getByText("Cucanj: 5 x 100kg")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("workout-log-submit"));

    await waitFor(() =>
      expect(logWorkout).toHaveBeenCalledWith({
        sets: [{ exerciseId: squat.id, reps: 5, weightKg: 100 }],
      }),
    );
    await waitFor(() => expect(screen.getByTestId("workout-log-result")).toBeTruthy());
    expect(screen.getByText(/1 novi licni rekord/)).toBeTruthy();
    await waitFor(() => expect(evaluateAchievements).toHaveBeenCalled());
  }, 15000);

  it("prikazuje novootkljucane achievement-e posle uspesnog treninga", async () => {
    const logWorkout = jest.fn().mockResolvedValue(logWorkoutResult);
    const evaluateAchievements = jest.fn().mockResolvedValue([
      {
        id: "00000000-0000-0000-0000-000000000040",
        code: "first_workout",
        title: "Prvi korak",
        description: "Zabelezi svoj prvi trening.",
        category: "training",
        requirementType: "workout_count",
        requirementValue: 1,
        xpReward: 50,
        coinReward: 10,
        unlocked: true,
        unlockedAt: "2026-01-05T10:00:00.000Z",
      },
    ]);
    mockedUseApiClient.mockReturnValue({
      listExercises: () => Promise.resolve([squat]),
      logWorkout,
      evaluateAchievements,
    });

    await render(<WorkoutLogScreen />);

    await waitFor(() =>
      expect(screen.getByTestId(`workout-log-exercise-${squat.id}`)).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId(`workout-log-exercise-${squat.id}`));
    await fireEvent.changeText(screen.getByTestId("workout-log-reps-input"), "5");
    await fireEvent.changeText(screen.getByTestId("workout-log-weight-input"), "100");
    await fireEvent.press(screen.getByTestId("workout-log-add-set"));
    await waitFor(() => expect(screen.getByTestId("workout-log-set-0")).toBeTruthy());
    await fireEvent.press(screen.getByTestId("workout-log-submit"));

    await waitFor(() => expect(screen.getByTestId("workout-log-new-achievements")).toBeTruthy());
    expect(screen.getByText("Prvi korak")).toBeTruthy();
  }, 15000);

  it("ne dozvoljava dodavanje seta bez izabrane vezbe ili validnog unosa", async () => {
    mockedUseApiClient.mockReturnValue({
      listExercises: () => Promise.resolve([squat]),
      logWorkout: jest.fn(),
    });

    await render(<WorkoutLogScreen />);

    await waitFor(() =>
      expect(screen.getByTestId(`workout-log-exercise-${squat.id}`)).toBeTruthy(),
    );
    await fireEvent.changeText(screen.getByTestId("workout-log-reps-input"), "5");
    await fireEvent.changeText(screen.getByTestId("workout-log-weight-input"), "100");
    await fireEvent.press(screen.getByTestId("workout-log-add-set"));

    expect(screen.queryByTestId("workout-log-set-0")).toBeNull();
  });

  it("prikazuje gresku kada slanje treninga ne uspe", async () => {
    const logWorkout = jest.fn().mockRejectedValue(new Error("network"));
    mockedUseApiClient.mockReturnValue({
      listExercises: () => Promise.resolve([squat]),
      logWorkout,
    });

    await render(<WorkoutLogScreen />);

    await waitFor(() =>
      expect(screen.getByTestId(`workout-log-exercise-${squat.id}`)).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId(`workout-log-exercise-${squat.id}`));
    await fireEvent.changeText(screen.getByTestId("workout-log-reps-input"), "5");
    await fireEvent.changeText(screen.getByTestId("workout-log-weight-input"), "100");
    await fireEvent.press(screen.getByTestId("workout-log-add-set"));
    await waitFor(() => expect(screen.getByTestId("workout-log-set-0")).toBeTruthy());

    await fireEvent.press(screen.getByTestId("workout-log-submit"));

    await waitFor(() => expect(screen.getByTestId("workout-log-error")).toBeTruthy());
  });
});
