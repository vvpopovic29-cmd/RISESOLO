import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { TrainingPlanResponse } from "@risesolo/validation";
import { TrainingPlanScreen } from "./TrainingPlanScreen";
import { useApiClient } from "../api/use-api-client";

jest.mock("../api/use-api-client", () => ({
  useApiClient: jest.fn(),
}));

const mockedUseApiClient = useApiClient as jest.Mock;

const emptyPlan: TrainingPlanResponse = {
  splitType: null,
  daysPerWeek: null,
  schedule: null,
  updatedAt: null,
};

const savedPlan: TrainingPlanResponse = {
  splitType: "push_pull_legs",
  daysPerWeek: 3,
  schedule: ["rest", "rest", "push", "rest", "pull", "rest", "legs"],
  updatedAt: new Date().toISOString(),
};

describe("TrainingPlanScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("prikazuje podrazumevani izbor (Push/Pull/Legs, 3 dana) kada plan jos ne postoji", async () => {
    mockedUseApiClient.mockReturnValue({
      getTrainingPlan: () => Promise.resolve(emptyPlan),
    });

    await render(<TrainingPlanScreen />);

    await waitFor(() =>
      expect(screen.getByTestId("training-plan-split-push_pull_legs")).toBeTruthy(),
    );
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.queryByTestId("training-plan-schedule")).toBeNull();
  });

  it("prikazuje postojeci plan i raspored kada je vec sacuvan", async () => {
    mockedUseApiClient.mockReturnValue({
      getTrainingPlan: () => Promise.resolve(savedPlan),
    });

    await render(<TrainingPlanScreen />);

    await waitFor(() => expect(screen.getByTestId("training-plan-schedule")).toBeTruthy());
    expect(screen.getByTestId("training-plan-day-2")).toBeTruthy();
    expect(screen.getByText("Push")).toBeTruthy();
    expect(screen.getAllByText("Odmor").length).toBeGreaterThan(0);
  });

  it("menja izabrani split i broj dana, pa cuva plan", async () => {
    const updateTrainingPlan = jest.fn().mockResolvedValue({
      ...savedPlan,
      splitType: "upper_lower",
      daysPerWeek: 4,
    });
    const getTrainingPlan = jest
      .fn()
      .mockResolvedValueOnce(emptyPlan)
      .mockResolvedValueOnce({ ...savedPlan, splitType: "upper_lower", daysPerWeek: 4 });
    mockedUseApiClient.mockReturnValue({ getTrainingPlan, updateTrainingPlan });

    await render(<TrainingPlanScreen />);

    await waitFor(() => expect(screen.getByTestId("training-plan-split-upper_lower")).toBeTruthy());
    await fireEvent.press(screen.getByTestId("training-plan-split-upper_lower"));
    await fireEvent.press(screen.getByTestId("training-plan-days-increment"));

    expect(screen.getByText("4")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("training-plan-save"));

    await waitFor(() =>
      expect(updateTrainingPlan).toHaveBeenCalledWith({
        splitType: "upper_lower",
        daysPerWeek: 4,
      }),
    );
    await waitFor(() => expect(getTrainingPlan).toHaveBeenCalledTimes(2));
  });

  it("ne dozvoljava manje od 1 ni vise od 7 trening dana", async () => {
    mockedUseApiClient.mockReturnValue({
      getTrainingPlan: () => Promise.resolve(emptyPlan),
    });

    await render(<TrainingPlanScreen />);

    await waitFor(() => expect(screen.getByTestId("training-plan-days-decrement")).toBeTruthy());

    await fireEvent.press(screen.getByTestId("training-plan-days-decrement"));
    await fireEvent.press(screen.getByTestId("training-plan-days-decrement"));
    await fireEvent.press(screen.getByTestId("training-plan-days-decrement"));

    expect(screen.getByText("1")).toBeTruthy();
  });

  it("prikazuje gresku kada cuvanje plana ne uspe", async () => {
    const updateTrainingPlan = jest.fn().mockRejectedValue(new Error("network"));
    mockedUseApiClient.mockReturnValue({
      getTrainingPlan: () => Promise.resolve(emptyPlan),
      updateTrainingPlan,
    });

    await render(<TrainingPlanScreen />);

    await waitFor(() => expect(screen.getByTestId("training-plan-save")).toBeTruthy());
    await fireEvent.press(screen.getByTestId("training-plan-save"));

    await waitFor(() => expect(screen.getByTestId("training-plan-save-error")).toBeTruthy());
  });
});
