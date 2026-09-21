import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useCustomItems } from "./use-custom-items";

function makeApiClient(list: ApiClient["inventory"]["custom"]["list"]): ApiClient {
  return { inventory: { custom: { list } } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useCustomItems(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{`total:${state.data.length}`}</Text>;
}

describe("useCustomItems", () => {
  it("prikazuje predmete koje je igrac sam napravio nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve([
        {
          id: "3f9e1c2a-0000-4000-8000-000000000001",
          source: "CUSTOM" as const,
          discovered: true,
          discoveredAt: "2026-09-21T10:00:00.000Z",
          name: "Moj Amulet",
          description: "Amulet koji sam sam napravio",
        },
      ]),
    );
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("total:1")).toBeTruthy());
  });

  it("prelazi u error stanje kada poziv ne uspe", async () => {
    const apiClient = makeApiClient(() => Promise.reject(new ApiError("Zahtev nije uspeo")));
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("error:Zahtev nije uspeo")).toBeTruthy());
  });
});
