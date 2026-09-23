import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useMainQuest } from "./use-main-quest";
import { I18nProvider } from "../i18n";

function makeApiClient(main: ApiClient["quests"]["main"]): ApiClient {
  return { quests: { main } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useMainQuest(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{`status:${state.data.status} tier:${state.data.tier} progress:${state.data.progress}/${state.data.targetProgress}`}</Text>;
}

describe("useMainQuest", () => {
  it("prikazuje main quest sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve({
        id: "main-1",
        kind: "strength" as const,
        tier: 1,
        title: "Povecaj Snagu",
        description: null,
        targetProgress: 10,
        progress: 3,
        xpReward: 400,
        coinReward: 100,
        status: "AVAILABLE" as const,
      }),
    );
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("status:AVAILABLE tier:1 progress:3/10")).toBeTruthy());
  });

  it("prelazi u error stanje kada poziv ne uspe", async () => {
    const apiClient = makeApiClient(() => Promise.reject(new ApiError("Zahtev nije uspeo")));
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("error:Zahtev nije uspeo")).toBeTruthy());
  });
});
