import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useAchievements } from "./use-achievements";

function makeApiClient(list: ApiClient["achievements"]["list"]): ApiClient {
  return { achievements: { list } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useAchievements(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  const unlockedCount = state.data.filter((a) => a.unlocked).length;
  return <Text>{`total:${state.data.length} unlocked:${unlockedCount}`}</Text>;
}

describe("useAchievements", () => {
  it("prikazuje katalog sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve([
        { id: "FIRST_WORKOUT", category: "WORKOUTS", unlocked: true, unlockedAt: "2026-03-10T10:00:00.000Z" },
        { id: "WORKOUTS_10", category: "WORKOUTS", unlocked: false, unlockedAt: null },
      ]),
    );
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("total:2 unlocked:1")).toBeTruthy());
  });

  it("prelazi u error stanje kada poziv ne uspe", async () => {
    const apiClient = makeApiClient(() => Promise.reject(new ApiError("Zahtev nije uspeo")));
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("error:Zahtev nije uspeo")).toBeTruthy());
  });
});
