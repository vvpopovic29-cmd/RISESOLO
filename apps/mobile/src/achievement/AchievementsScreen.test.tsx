import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { AchievementResponse } from "@risesolo/validation";
import { AchievementsScreen } from "./AchievementsScreen";
import { useApiClient } from "../api/use-api-client";

jest.mock("../api/use-api-client", () => ({
  useApiClient: jest.fn(),
}));

const mockedUseApiClient = useApiClient as jest.Mock;

const unlockedAchievement: AchievementResponse = {
  id: "00000000-0000-0000-0000-000000000040",
  code: "first_workout",
  title: "Prvi korak",
  description: "Zabelezi svoj prvi trening.",
  category: "training",
  requirementType: "workout_count",
  requirementValue: 1,
  xpReward: 50,
  coinReward: 10,
  unlocked: true,
  unlockedAt: "2026-01-05T10:00:00.000Z",
};

const lockedAchievement: AchievementResponse = {
  id: "00000000-0000-0000-0000-000000000041",
  code: "streak_7",
  title: "Nedelja discipline",
  description: "Dostigni streak od 7 dana.",
  category: "consistency",
  requirementType: "longest_streak",
  requirementValue: 7,
  xpReward: 250,
  coinReward: 60,
  unlocked: false,
  unlockedAt: null,
};

describe("AchievementsScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("prikazuje otkljucane i zakljucane achievement-e grupisane po kategoriji", async () => {
    mockedUseApiClient.mockReturnValue({
      listAchievements: () => Promise.resolve([unlockedAchievement, lockedAchievement]),
    });

    await render(<AchievementsScreen />);

    await waitFor(() => expect(screen.getByTestId("achievements-list")).toBeTruthy());
    expect(screen.getByText("1 / 2 otkljucano")).toBeTruthy();
    expect(screen.getByTestId("achievement-first_workout")).toBeTruthy();
    expect(screen.getByTestId("achievement-streak_7")).toBeTruthy();
    expect(screen.getByText("Otkljucano")).toBeTruthy();
    expect(screen.getByText("Zakljucano")).toBeTruthy();
  });

  it("prikazuje gresku i dugme za ponovni pokusaj kada zahtev ne uspe", async () => {
    mockedUseApiClient.mockReturnValue({
      listAchievements: () => Promise.reject(new Error("network")),
    });

    await render(<AchievementsScreen />);

    await waitFor(() => expect(screen.getByTestId("achievements-error")).toBeTruthy());
    expect(screen.getByText(/Pokusaj ponovo/i)).toBeTruthy();
  });

  it("ponovo ucitava listu kada se pritisne dugme za ponovni pokusaj", async () => {
    const listAchievements = jest
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce([unlockedAchievement]);
    mockedUseApiClient.mockReturnValue({ listAchievements });

    await render(<AchievementsScreen />);

    await waitFor(() => expect(screen.getByTestId("achievements-error")).toBeTruthy());
    await fireEvent.press(screen.getByText(/Pokusaj ponovo/i));

    await waitFor(() => expect(screen.getByTestId("achievements-list")).toBeTruthy());
    expect(listAchievements).toHaveBeenCalledTimes(2);
  });
});
