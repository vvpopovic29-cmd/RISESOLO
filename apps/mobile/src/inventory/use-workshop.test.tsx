import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useWorkshop } from "./use-workshop";
import { I18nProvider } from "../i18n";

function makeApiClient(list: ApiClient["inventory"]["workshop"]["list"]): ApiClient {
  return { inventory: { workshop: { list } } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useWorkshop(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  const ownedCount = state.data.filter((item) => item.owned).length;
  return <Text>{`total:${state.data.length} owned:${ownedCount}`}</Text>;
}

describe("useWorkshop", () => {
  it("prikazuje katalog sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve([
        {
          id: "IRON_TALISMAN",
          name: "Gvozdeni Talisman",
          description: "d",
          levelRequirement: 3,
          coinCost: 200,
          owned: true,
        },
        {
          id: "STEEL_EMBLEM",
          name: "Celicni Amblem",
          description: "d",
          levelRequirement: 6,
          coinCost: 500,
          owned: false,
        },
      ]),
    );
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("total:2 owned:1")).toBeTruthy());
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
