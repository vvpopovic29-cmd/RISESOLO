import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useWeeklyQuest } from "./use-weekly-quest";
import { I18nProvider } from "../i18n";

function makeApiClient(weekly: ApiClient["quests"]["weekly"]): ApiClient {
  return { quests: { weekly } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useWeeklyQuest(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{`status:${state.data.status} progress:${state.data.progress}/${state.data.targetProgress}`}</Text>;
}

describe("useWeeklyQuest", () => {
  it("prikazuje nedeljni quest sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve({
        id: "weekly-1",
        weekStart: "2026-09-14",
        kind: "XP_TARGET" as const,
        title: "Nedeljni XP izazov",
        description: null,
        targetProgress: 800,
        progress: 250,
        xpReward: 300,
        coinReward: 80,
        status: "AVAILABLE" as const,
      }),
    );
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("status:AVAILABLE progress:250/800")).toBeTruthy());
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
