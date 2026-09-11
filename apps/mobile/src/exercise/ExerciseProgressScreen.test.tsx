import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ExerciseProgressResponse, ExerciseResponse } from "@risesolo/validation";
import { ExerciseProgressScreen } from "./ExerciseProgressScreen";
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

const progress: ExerciseProgressResponse = {
  exerciseId: squat.id,
  trend: "up",
  sessions: [
    {
      workoutId: "00000000-0000-0000-0000-000000000020",
      performedAt: "2026-01-01T10:00:00.000Z",
      sets: [{ setNumber: 1, reps: 8, weightKg: 60 }],
      topEstimated1Rm: 76,
    },
    {
      workoutId: "00000000-0000-0000-0000-000000000021",
      performedAt: "2026-01-08T10:00:00.000Z",
      sets: [{ setNumber: 1, reps: 8, weightKg: 65 }],
      topEstimated1Rm: 82.3,
    },
  ],
};

describe("ExerciseProgressScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("prikazuje poruku da treba izabrati vezbu dok nista nije izabrano", async () => {
    mockedUseApiClient.mockReturnValue({
      listExercises: () => Promise.resolve([squat]),
      getExerciseProgress: jest.fn(),
    });

    await render(<ExerciseProgressScreen />);

    await waitFor(() => expect(screen.getByText(/Izaberi vezbu/i)).toBeTruthy());
  });

  it("prikazuje trend i sesije kada je vezba izabrana", async () => {
    const getExerciseProgress = jest.fn().mockResolvedValue(progress);
    mockedUseApiClient.mockReturnValue({
      listExercises: () => Promise.resolve([squat]),
      getExerciseProgress,
    });

    await render(<ExerciseProgressScreen />);

    await waitFor(() =>
      expect(screen.getByTestId(`exercise-progress-exercise-${squat.id}`)).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId(`exercise-progress-exercise-${squat.id}`));

    await waitFor(() => expect(screen.getByTestId("exercise-progress-result")).toBeTruthy());
    expect(getExerciseProgress).toHaveBeenCalledWith(squat.id);
    expect(screen.getByText(/U usponu/)).toBeTruthy();
    expect(screen.getByText("~76kg 1RM")).toBeTruthy();
    expect(screen.getByText("~82kg 1RM")).toBeTruthy();
  });

  it("prikazuje gresku kada ucitavanje napretka ne uspe", async () => {
    const getExerciseProgress = jest.fn().mockRejectedValue(new Error("network"));
    mockedUseApiClient.mockReturnValue({
      listExercises: () => Promise.resolve([squat]),
      getExerciseProgress,
    });

    await render(<ExerciseProgressScreen />);

    await waitFor(() =>
      expect(screen.getByTestId(`exercise-progress-exercise-${squat.id}`)).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId(`exercise-progress-exercise-${squat.id}`));

    await waitFor(() => expect(screen.getByTestId("exercise-progress-error")).toBeTruthy());
  });
});
