import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useActiveSession } from "./use-active-session";
import { I18nProvider } from "../i18n";

function makeApiClient(getActiveSession: ApiClient["workouts"]["getActiveSession"]): ApiClient {
  return { workouts: { getActiveSession } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useActiveSession(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{state.data.session ? `active:${state.data.session.id}` : "none"}</Text>;
}

describe("useActiveSession", () => {
  it("prikazuje 'none' kada korisnik nema pauziran trening", async () => {
    const apiClient = makeApiClient(() => Promise.resolve({ session: null, sets: [] }));
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("none")).toBeTruthy());
  });

  it("prikazuje id pauzirane sesije kada postoji", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve({
        session: { id: "session-1", workoutId: null, status: "IN_PROGRESS" as const, startedAt: "2026-01-01T00:00:00.000Z", completedAt: null },
        sets: [],
      }),
    );
    await render(
      <I18nProvider>
        <Probe apiClient={apiClient} />
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("active:session-1")).toBeTruthy());
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
