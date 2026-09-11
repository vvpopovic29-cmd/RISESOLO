import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ExerciseResponse, WorkoutResponse } from "@risesolo/validation";
import { WorkoutHistoryScreen } from "./WorkoutHistoryScreen";
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

const workout: WorkoutResponse = {
  id: "00000000-0000-0000-0000-000000000020",
  performedAt: "2026-01-05T10:00:00.000Z",
  notes: "Dobar trening",
};

const workoutDetail: WorkoutResponse = {
  ...workout,
  sets: [
    {
      id: "00000000-0000-0000-0000-000000000030",
      exerciseId: squat.id,
      setNumber: 1,
      reps: 8,
      weightKg: 60,
    },
  ],
};

describe("WorkoutHistoryScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("prikazuje poruku kada nema zabelezenih treninga", async () => {
    mockedUseApiClient.mockReturnValue({
      listWorkouts: () => Promise.resolve([]),
      listExercises: () => Promise.resolve([squat]),
    });

    await render(<WorkoutHistoryScreen />);

    await waitFor(() => expect(screen.getByText(/Jos nema zabelezenih treninga/i)).toBeTruthy());
  });

  it("prikazuje listu treninga i detalje kada se jedan izabere", async () => {
    const getWorkout = jest.fn().mockResolvedValue(workoutDetail);
    mockedUseApiClient.mockReturnValue({
      listWorkouts: () => Promise.resolve([workout]),
      listExercises: () => Promise.resolve([squat]),
      getWorkout,
    });

    await render(<WorkoutHistoryScreen />);

    await waitFor(() =>
      expect(screen.getByTestId(`workout-history-item-${workout.id}`)).toBeTruthy(),
    );
    expect(screen.getByText("Dobar trening")).toBeTruthy();

    await fireEvent.press(screen.getByTestId(`workout-history-item-${workout.id}`));

    await waitFor(() => expect(screen.getByTestId("workout-history-detail")).toBeTruthy());
    expect(getWorkout).toHaveBeenCalledWith(workout.id);
    expect(screen.getByText("Cucanj")).toBeTruthy();
    expect(screen.getByText("8 x 60kg")).toBeTruthy();
  });

  it("prikazuje gresku kada ucitavanje istorije ne uspe", async () => {
    mockedUseApiClient.mockReturnValue({
      listWorkouts: () => Promise.reject(new Error("network")),
      listExercises: () => Promise.resolve([squat]),
    });

    await render(<WorkoutHistoryScreen />);

    await waitFor(() => expect(screen.getByTestId("workout-history-error")).toBeTruthy());
  });
});
