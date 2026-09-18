import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { usePenaltyQuest } from "./use-penalty-quest";

function makeApiClient(penalty: ApiClient["quests"]["penalty"]): ApiClient {
  return { quests: { penalty } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = usePenaltyQuest(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  if (state.data === null) return <Text>none</Text>;
  return <Text>{`status:${state.data.status} progress:${state.data.progress}/${state.data.targetProgress}`}</Text>;
}

describe("usePenaltyQuest", () => {
  it("prikazuje penalty quest sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve({
        quest: {
          id: "penalty-1",
          kind: "REDEMPTION_WORKOUT" as const,
          title: "Iskupljenje",
          description: null,
          targetProgress: 2,
          progress: 0,
          xpReward: 50,
          coinReward: 20,
          status: "AVAILABLE" as const,
        },
      }),
    );
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("status:AVAILABLE progress:0/2")).toBeTruthy());
  });

  it("prikazuje 'nista' stanje kada server vrati quest: null (normalno stanje)", async () => {
    const apiClient = makeApiClient(() => Promise.resolve({ quest: null }));
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("none")).toBeTruthy());
  });

  it("prelazi u error stanje kada poziv ne uspe", async () => {
    const apiClient = makeApiClient(() => Promise.reject(new ApiError("Zahtev nije uspeo")));
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("error:Zahtev nije uspeo")).toBeTruthy());
  });
});
