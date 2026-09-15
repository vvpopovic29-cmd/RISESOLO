import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useBossQuest } from "./use-boss-quest";

function makeApiClient(boss: ApiClient["quests"]["boss"]): ApiClient {
  return { quests: { boss } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useBossQuest(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{`status:${state.data.status} progress:${state.data.progress}/${state.data.targetSessions}`}</Text>;
}

describe("useBossQuest", () => {
  it("prikazuje boss quest sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve({
        id: "boss-1",
        weekStart: "2026-09-14",
        title: "Nedeljni Boss Quest",
        description: null,
        targetSessions: 3,
        progress: 1,
        xpReward: 500,
        coinReward: 150,
        status: "AVAILABLE" as const,
      }),
    );
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("status:AVAILABLE progress:1/3")).toBeTruthy());
  });

  it("prelazi u error stanje kada poziv ne uspe", async () => {
    const apiClient = makeApiClient(() => Promise.reject(new ApiError("Zahtev nije uspeo")));
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("error:Zahtev nije uspeo")).toBeTruthy());
  });
});
