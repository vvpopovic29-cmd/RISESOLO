import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useGuildLeaderboard } from "./use-guild-leaderboard";

function makeApiClient(guilds: ApiClient["leaderboard"]["guilds"]): ApiClient {
  return { leaderboard: { guilds } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useGuildLeaderboard(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{`entries:${state.data.entries.length} myGuild:${state.data.myGuild ? state.data.myGuild.tag : "none"}`}</Text>;
}

describe("useGuildLeaderboard", () => {
  it("prikazuje leaderboard sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve({
        entries: [{ position: 1, guildId: "g1", name: "Alpha", tag: "ALP", level: 3, totalXp: 3000, memberCount: 5 }],
        myGuild: null,
      }),
    );
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("entries:1 myGuild:none")).toBeTruthy());
  });

  it("prelazi u error stanje kada poziv ne uspe", async () => {
    const apiClient = makeApiClient(() => Promise.reject(new ApiError("Zahtev nije uspeo")));
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("error:Zahtev nije uspeo")).toBeTruthy());
  });
});
