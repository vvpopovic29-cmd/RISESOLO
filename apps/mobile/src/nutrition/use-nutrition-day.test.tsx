import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { useNutritionDay } from "./use-nutrition-day";

function makeApiClient(getDay: ApiClient["nutrition"]["getDay"]): ApiClient {
  return { nutrition: { getDay } } as unknown as ApiClient;
}

function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = useNutritionDay(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{`entries:${state.data.entries.length} calories:${state.data.totals.calories}`}</Text>;
}

describe("useNutritionDay", () => {
  it("prikazuje dnevni rezime sa servera nakon uspesnog poziva", async () => {
    const apiClient = makeApiClient(() =>
      Promise.resolve({
        date: "2026-03-10",
        entries: [
          {
            id: "entry-1",
            date: "2026-03-10",
            mealType: "BREAKFAST" as const,
            name: "Ovsena kasa",
            calories: 350,
            proteinG: 15,
            carbsG: 55,
            fatG: 8,
          },
        ],
        totals: { calories: 350, proteinG: 15, carbsG: 55, fatG: 8 },
      }),
    );
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("entries:1 calories:350")).toBeTruthy());
  });

  it("prelazi u error stanje kada poziv ne uspe", async () => {
    const apiClient = makeApiClient(() => Promise.reject(new ApiError("Zahtev nije uspeo")));
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("error:Zahtev nije uspeo")).toBeTruthy());
  });
});
