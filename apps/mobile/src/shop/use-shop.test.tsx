import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useShop } from "./use-shop";

function makeApiClient(list: ApiClient["shop"]["list"]): ApiClient {
  return { shop: { list } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useShop(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{`count:${state.data.length}`}</Text>;
}

describe("useShop", () => {
  it("prikazuje katalog sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve([
        { id: "FRAME_BRONZE", category: "AVATAR_FRAME" as const, name: "Bronzani okvir", description: "d", price: 100, colorHex: "#CD7F32", owned: false, equipped: false },
      ]),
    );
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("count:1")).toBeTruthy());
  });

  it("prelazi u error stanje kada poziv ne uspe", async () => {
    const apiClient = makeApiClient(() => Promise.reject(new ApiError("Zahtev nije uspeo")));
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("error:Zahtev nije uspeo")).toBeTruthy());
  });
});
