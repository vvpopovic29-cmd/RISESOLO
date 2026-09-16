import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useSubscriptionStatus } from "./use-subscription-status";

function makeApiClient(getStatus: ApiClient["subscriptions"]["getStatus"]): ApiClient {
  return { subscriptions: { getStatus } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useSubscriptionStatus(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{`isPro:${state.data.isPro}`}</Text>;
}

describe("useSubscriptionStatus", () => {
  it("prikazuje status sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve({ isPro: true, productId: "monthly_pro", expiresAt: "2026-12-01T00:00:00.000Z", willRenew: true }),
    );
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("isPro:true")).toBeTruthy());
  });

  it("prelazi u error stanje kada poziv ne uspe", async () => {
    const apiClient = makeApiClient(() => Promise.reject(new ApiError("Zahtev nije uspeo")));
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("error:Zahtev nije uspeo")).toBeTruthy());
  });
});
