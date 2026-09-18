import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useGuildItems } from "./use-guild-items";

function makeApiClient(guild: ApiClient["inventory"]["guild"]): ApiClient {
  return { inventory: { guild } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useGuildItems(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  const discoveredCount = state.data.filter((item) => item.discovered).length;
  return <Text>{`total:${state.data.length} discovered:${discoveredCount}`}</Text>;
}

describe("useGuildItems", () => {
  it("prikazuje katalog sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve([
        {
          id: "GUILD_FOUNDER",
          source: "GUILD" as const,
          discovered: true,
          discoveredAt: "2026-03-10T10:00:00.000Z",
          name: "Osnivac Ceha",
          description: "d",
        },
        {
          id: "RAID_BREAKER",
          source: "GUILD" as const,
          discovered: false,
          discoveredAt: null,
          name: "Razbijac Rejdova",
          description: "d",
        },
      ]),
    );
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("total:2 discovered:1")).toBeTruthy());
  });

  it("prelazi u error stanje kada poziv ne uspe", async () => {
    const apiClient = makeApiClient(() => Promise.reject(new ApiError("Zahtev nije uspeo")));
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("error:Zahtev nije uspeo")).toBeTruthy());
  });
});
