import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useSideQuest } from "./use-side-quest";
import { I18nProvider } from "../i18n";

function makeApiClient(side: ApiClient["quests"]["side"]): ApiClient {
  return { quests: { side } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useSideQuest(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  if (state.data === null) return <Text>exhausted</Text>;
  return <Text>{`status:${state.data.status} progress:${state.data.progress}/${state.data.targetProgress}`}</Text>;
}

describe("useSideQuest", () => {
  it("prikazuje side quest sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve({
        quest: {
          id: "side-1",
          kind: "NEW_EXERCISE" as const,
          title: "Nova Vezba",
          description: null,
          targetProgress: 1,
          progress: 0,
          xpReward: 50,
          coinReward: 10,
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

  it("prikazuje iscrpljeno stanje kada server vrati quest: null", async () => {
    const apiClient = makeApiClient(() => Promise.resolve({ quest: null }));
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("exhausted")).toBeTruthy());
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
