import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useAiItems } from "./use-ai-items";

function makeApiClient(ai: ApiClient["inventory"]["ai"]): ApiClient {
  return { inventory: { ai } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useAiItems(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  const discoveredCount = state.data.filter((item) => item.discovered).length;
  return <Text>{`total:${state.data.length} discovered:${discoveredCount}`}</Text>;
}

describe("useAiItems", () => {
  it("prikazuje katalog sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve([
        {
          id: "FIRST_SPARK",
          source: "AI_GENERATED" as const,
          discovered: true,
          discoveredAt: "2026-03-10T10:00:00.000Z",
          name: "AI Generisan Naziv",
          description: "d",
        },
        {
          id: "RISING_PULSE",
          source: "AI_GENERATED" as const,
          discovered: false,
          discoveredAt: null,
          name: null,
          description: null,
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
