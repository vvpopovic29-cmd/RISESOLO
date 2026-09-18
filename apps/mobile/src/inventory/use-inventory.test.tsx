import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useInventory } from "./use-inventory";

function makeApiClient(list: ApiClient["inventory"]["list"]): ApiClient {
  return { inventory: { list } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useInventory(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  const discoveredCount = state.data.filter((item) => item.discovered).length;
  return <Text>{`total:${state.data.length} discovered:${discoveredCount}`}</Text>;
}

describe("useInventory", () => {
  it("prikazuje katalog sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve([
        {
          id: "MIDNIGHT_WARRIOR",
          source: "HIDDEN" as const,
          discovered: true,
          discoveredAt: "2026-03-10T10:00:00.000Z",
          name: "Nocni Ratnik",
          description: "Opis.",
        },
        { id: "CENTURY_CLUB", source: "HIDDEN" as const, discovered: false, discoveredAt: null, name: null, description: null },
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
