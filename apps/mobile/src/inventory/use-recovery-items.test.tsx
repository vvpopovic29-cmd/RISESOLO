import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useRecoveryItems } from "./use-recovery-items";

function makeApiClient(recovery: ApiClient["inventory"]["recovery"]): ApiClient {
  return { inventory: { recovery } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useRecoveryItems(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  const discoveredCount = state.data.filter((item) => item.discovered).length;
  return <Text>{`total:${state.data.length} discovered:${discoveredCount}`}</Text>;
}

describe("useRecoveryItems", () => {
  it("prikazuje katalog sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve([
        {
          id: "FIRST_REST_DAY",
          source: "RECOVERY" as const,
          discovered: true,
          discoveredAt: "2026-03-10T10:00:00.000Z",
          name: "Prvi Odmor",
          description: "d",
        },
        {
          id: "THE_COMEBACK",
          source: "RECOVERY" as const,
          discovered: false,
          discoveredAt: null,
          name: "Povratak",
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
