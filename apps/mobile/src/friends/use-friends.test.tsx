import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useFriends } from "./use-friends";
import { I18nProvider } from "../i18n";

function makeApiClient(getOverview: ApiClient["friends"]["getOverview"]): ApiClient {
  return { friends: { getOverview } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useFriends(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{`friends:${state.data.friends.length} incoming:${state.data.incomingRequests.length}`}</Text>;
}

describe("useFriends", () => {
  it("prikazuje overview sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve({
        friends: [{ userId: "u1", username: "ana", level: 3, rank: "E" as const, totalXp: 500 }],
        incomingRequests: [{ id: "r1", userId: "u2", username: "marko", createdAt: "2026-01-01T00:00:00.000Z" }],
        outgoingRequests: [],
      }),
    );
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("friends:1 incoming:1")).toBeTruthy());
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
