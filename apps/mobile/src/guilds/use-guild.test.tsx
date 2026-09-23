import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useGuild } from "./use-guild";
import { I18nProvider } from "../i18n";

function makeApiClient(getMine: ApiClient["guilds"]["getMine"]): ApiClient {
  return { guilds: { getMine } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useGuild(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "none") return <Text>none</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{`guild:${state.data.tag} level:${state.data.level}`}</Text>;
}

describe("useGuild", () => {
  it("prikazuje ceh sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve({
        id: "guild-1",
        name: "Zeljezni vukovi",
        tag: "VUKOVI",
        description: null,
        level: 2,
        totalXp: 150,
        currentLevelXp: 50,
        requiredXp: 200,
        progress: 0.25,
        treasuryCoins: 30,
        myRole: "LEADER" as const,
        members: [],
        raid: {
          id: "raid-1",
          weekStart: "2026-09-14",
          targetContributions: 20,
          progress: 0,
          coinReward: 1000,
          status: "AVAILABLE" as const,
        },
      }),
    );
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("guild:VUKOVI level:2")).toBeTruthy());
  });

  it("prelazi u 'none' stanje kada korisnik nije clan nijednog ceha (404)", async () => {
    const apiClient = makeApiClient(() => Promise.reject(new ApiError("Nisi clan nijednog ceha", 404)));
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("none")).toBeTruthy());
  });

  it("prelazi u error stanje za ostale greske", async () => {
    const apiClient = makeApiClient(() => Promise.reject(new ApiError("Zahtev nije uspeo", 500)));
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("error:Zahtev nije uspeo")).toBeTruthy());
  });
});
