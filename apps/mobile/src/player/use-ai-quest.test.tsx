import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useAiQuest } from "./use-ai-quest";
import { I18nProvider } from "../i18n";

function makeApiClient(ai: ApiClient["quests"]["ai"]): ApiClient {
  return { quests: { ai } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useAiQuest(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  if (state.data === null) return <Text>none</Text>;
  return <Text>{`status:${state.data.status} progress:${state.data.progress}/${state.data.targetProgress}`}</Text>;
}

describe("useAiQuest", () => {
  it("prikazuje AI quest sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve({
        quest: {
          id: "ai-1",
          kind: "AI_PERSONALIZED" as const,
          title: "Personalizovan naslov",
          description: "AI opis.",
          targetProgress: 1,
          progress: 0,
          xpReward: 150,
          coinReward: 30,
          status: "AVAILABLE" as const,
        },
      }),
    );
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("status:AVAILABLE progress:0/1")).toBeTruthy());
  });

  it("prikazuje 'nista' stanje kada server vrati quest: null (besplatan korisnik ili AI nedostupan)", async () => {
    const apiClient = makeApiClient(() => Promise.resolve({ quest: null }));
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("none")).toBeTruthy());
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
