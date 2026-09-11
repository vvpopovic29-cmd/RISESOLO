import { render, screen, waitFor } from "@testing-library/react-native";
import { StagnationAlert } from "./StagnationAlert";
import { useApiClient } from "../api/use-api-client";

jest.mock("../api/use-api-client", () => ({
  useApiClient: jest.fn(),
}));

const mockedUseApiClient = useApiClient as jest.Mock;

describe("StagnationAlert", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("ne prikazuje nista kada nijedna vezba ne stagnira niti se preporucuje deload", async () => {
    mockedUseApiClient.mockReturnValue({
      getStagnationSummary: () =>
        Promise.resolve({
          stagnantExercises: [],
          regressingExercises: [],
          deloadRecommended: false,
        }),
    });

    await render(<StagnationAlert />);

    await waitFor(() => expect(screen.queryByTestId("stagnation-alert")).toBeNull());
  });

  it("prikazuje upozorenje sa nazivom vezbe kada tacno jedna stagnira", async () => {
    mockedUseApiClient.mockReturnValue({
      getStagnationSummary: () =>
        Promise.resolve({
          stagnantExercises: [
            { exerciseId: "00000000-0000-0000-0000-000000000010", exerciseName: "Cucanj" },
          ],
          regressingExercises: [],
          deloadRecommended: false,
        }),
    });

    await render(<StagnationAlert />);

    await waitFor(() => expect(screen.getByTestId("stagnation-alert")).toBeTruthy());
    expect(screen.getByText(/Cucanj stagnira/)).toBeTruthy();
  });

  it("prikazuje zbirnu poruku kada vise vezbi stagnira", async () => {
    mockedUseApiClient.mockReturnValue({
      getStagnationSummary: () =>
        Promise.resolve({
          stagnantExercises: [
            { exerciseId: "00000000-0000-0000-0000-000000000010", exerciseName: "Cucanj" },
            { exerciseId: "00000000-0000-0000-0000-000000000011", exerciseName: "Benc" },
          ],
          regressingExercises: [],
          deloadRecommended: false,
        }),
    });

    await render(<StagnationAlert />);

    await waitFor(() => expect(screen.getByText(/2 vezbi stagnira/)).toBeTruthy());
  });

  it("prikazuje Deload preporuku kada je deloadRecommended true", async () => {
    mockedUseApiClient.mockReturnValue({
      getStagnationSummary: () =>
        Promise.resolve({
          stagnantExercises: [],
          regressingExercises: [
            { exerciseId: "00000000-0000-0000-0000-000000000010", exerciseName: "Cucanj" },
            { exerciseId: "00000000-0000-0000-0000-000000000011", exerciseName: "Benc" },
          ],
          deloadRecommended: true,
        }),
    });

    await render(<StagnationAlert />);

    await waitFor(() => expect(screen.getByTestId("deload-recommendation")).toBeTruthy());
    expect(screen.getByText(/Deload nedelja preporucena/)).toBeTruthy();
  });

  it("prikazuje i deload preporuku i stagnaciono upozorenje kada oba postoje", async () => {
    mockedUseApiClient.mockReturnValue({
      getStagnationSummary: () =>
        Promise.resolve({
          stagnantExercises: [
            { exerciseId: "00000000-0000-0000-0000-000000000012", exerciseName: "Cucanj" },
          ],
          regressingExercises: [
            { exerciseId: "00000000-0000-0000-0000-000000000010", exerciseName: "Benc" },
            { exerciseId: "00000000-0000-0000-0000-000000000011", exerciseName: "Deadlift" },
          ],
          deloadRecommended: true,
        }),
    });

    await render(<StagnationAlert />);

    await waitFor(() => expect(screen.getByTestId("deload-recommendation")).toBeTruthy());
    expect(screen.getByText(/Cucanj stagnira/)).toBeTruthy();
  });
});
