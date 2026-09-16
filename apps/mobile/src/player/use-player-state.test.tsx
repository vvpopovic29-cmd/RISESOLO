import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ApiClient } from "@risesolo/api-client";
import { ApiError } from "@risesolo/api-client";
import { usePlayerState } from "./use-player-state";

function samplePlayerState() {
  return {
    profile: {
      username: "tester",
      avatarUrl: null,
      age: null,
      heightCm: null,
      weightKg: null,
      trainingType: null,
      experienceLevel: null,
      onboarded: true,
    },
    progression: {
      totalXp: 250,
      level: 2,
      currentLevelXp: 150,
      requiredXp: 400,
      progress: 0.375,
      rank: "E" as const,
      coins: 40,
      currentStreak: 1,
    },
    stats: { strength: 1, agility: 1, endurance: 1, vitality: 1, intelligence: 1, statPoints: 3 },
    penalty: { applied: false, missedQuestCount: 0, coinsLost: 0 },
  };
}

function makeApiClient(getMe: ApiClient["players"]["getMe"]): ApiClient {
  return { players: { getMe } } as unknown as ApiClient;
}

/** Tanak test harness - render-uje hook stanje kao tekst, isti obrazac kao HealthStatus.test.tsx. */
function Probe({ apiClient }: { apiClient: ApiClient }) {
  const { state } = usePlayerState(apiClient);
  if (state.status === "loading") return <Text>loading</Text>;
  if (state.status === "error") return <Text>{`error:${state.message}`}</Text>;
  return <Text>{`level:${state.data.progression.level} statPoints:${state.data.stats.statPoints}`}</Text>;
}

describe("usePlayerState", () => {
  it("pocinje u loading stanju pa prelazi u success sa podacima sa servera", async () => {
    const apiClient = makeApiClient(() => Promise.resolve(samplePlayerState()));
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("level:2 statPoints:3")).toBeTruthy());
  });

  it("prelazi u error stanje sa porukom iz ApiError kada poziv ne uspe", async () => {
    const apiClient = makeApiClient(() => Promise.reject(new ApiError("Neautorizovan pristup", 401)));
    await render(<Probe apiClient={apiClient} />);

    await waitFor(() => expect(screen.getByText("error:Neautorizovan pristup")).toBeTruthy());
  });
});
