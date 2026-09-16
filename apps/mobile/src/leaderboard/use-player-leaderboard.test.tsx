import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { usePlayerLeaderboard } from "./use-player-leaderboard";

function makeApiClient(players: ApiClient["leaderboard"]["players"]): ApiClient {
  return { leaderboard: { players } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = usePlayerLeaderboard(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{`entries:${state.data.entries.length} mePosition:${state.data.me.position}`}</Text>;
}

describe("usePlayerLeaderboard", () => {
  it("prikazuje leaderboard sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve({
        entries: [{ position: 1, userId: "u1", username: "prvi", level: 5, rank: "D" as const, totalXp: 5000 }],
        me: { position: 1, userId: "u1", username: "prvi", level: 5, rank: "D" as const, totalXp: 5000 },
      }),
    );
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("entries:1 mePosition:1")).toBeTruthy());
  });

  it("prelazi u error stanje kada poziv ne uspe", async () => {
    const apiClient = makeApiClient(() => Promise.reject(new ApiError("Zahtev nije uspeo")));
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("error:Zahtev nije uspeo")).toBeTruthy());
  });
});
