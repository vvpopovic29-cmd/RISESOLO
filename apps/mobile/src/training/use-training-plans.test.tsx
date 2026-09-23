import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useTrainingPlans } from "./use-training-plans";
import { I18nProvider } from "../i18n";

function makeApiClient(list: ApiClient["trainingPlans"]["list"]): ApiClient {
  return { trainingPlans: { list } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useTrainingPlans(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{`count:${state.data.length}`}</Text>;
}

describe("useTrainingPlans", () => {
  it("prikazuje listu planova sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve([
        {
          id: "plan-1",
          title: "Full body 3x nedeljno",
          summary: null,
          daysPerWeek: 3,
          model: "claude-sonnet-5",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    );
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("count:1")).toBeTruthy());
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
