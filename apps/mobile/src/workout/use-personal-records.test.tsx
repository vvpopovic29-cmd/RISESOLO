import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { usePersonalRecords } from "./use-personal-records";

function makeApiClient(personalRecords: ApiClient["workouts"]["personalRecords"]): ApiClient {
  return { workouts: { personalRecords } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = usePersonalRecords(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{`count:${state.data.length}`}</Text>;
}

describe("usePersonalRecords", () => {
  it("prikazuje rekorde sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve([
        { exerciseId: "e1", exerciseSlug: "push-up", exerciseName: "Push-Up", bestReps: 20, bestDurationSeconds: null },
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
