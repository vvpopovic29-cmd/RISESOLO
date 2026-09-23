import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useEventItems } from "./use-event-items";
import { I18nProvider } from "../i18n";

function makeApiClient(list: ApiClient["inventory"]["event"]["list"]): ApiClient {
  return { inventory: { event: { list } } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useEventItems(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  const activeCount = state.data.filter((item) => item.active).length;
  return <Text>{`total:${state.data.length} active:${activeCount}`}</Text>;
}

describe("useEventItems", () => {
  it("prikazuje katalog sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve([
        { id: "AUTUMN_HARVEST", name: "Jesenja Zetva", description: "d", active: true, owned: false },
        { id: "WINTER_WARRIOR", name: "Zimski Ratnik", description: "d", active: false, owned: false },
      ]),
    );
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("total:2 active:1")).toBeTruthy());
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
