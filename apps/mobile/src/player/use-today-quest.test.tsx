import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useTodayQuest } from "./use-today-quest";
import { I18nProvider } from "../i18n";

function makeApiClient(today: ApiClient["quests"]["today"]): ApiClient {
  return { quests: { today } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useTodayQuest(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{`status:${state.data.status} xp:${state.data.xpReward}`}</Text>;
}

describe("useTodayQuest", () => {
  it("prikazuje quest sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve({
        id: "quest-1",
        date: "2026-01-01",
        kind: "WORKOUT_COMPLETE" as const,
        title: "Zavrsi danasnji trening",
        description: null,
        targetReps: null,
        targetSets: 3,
        xpReward: 100,
        coinReward: 15,
        status: "AVAILABLE" as const,
      }),
    );
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("status:AVAILABLE xp:100")).toBeTruthy());
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
