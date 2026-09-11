import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { QuestResponse } from "@risesolo/validation";
import { DailyQuestCard } from "./DailyQuestCard";
import { useApiClient } from "../api/use-api-client";

jest.mock("../api/use-api-client", () => ({
  useApiClient: jest.fn(),
}));

const mockedUseApiClient = useApiClient as jest.Mock;

const baseQuest: QuestResponse = {
  id: "00000000-0000-0000-0000-000000000002",
  type: "daily",
  title: "Zavrsi danasnji trening",
  description: "Zavrsi bar jedan trening danas.",
  linkedAction: "workout",
  targetCount: 1,
  progressCount: 0,
  xpReward: 500,
  coinReward: 20,
  status: "active",
  expiresAt: null,
  completedAt: null,
  createdAt: new Date().toISOString(),
  targetRank: null,
};

describe("DailyQuestCard", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("prikazuje loading stanje pre nego sto se zahtev zavrsi", async () => {
    mockedUseApiClient.mockReturnValue({ listQuests: () => new Promise(() => {}) });

    await render(<DailyQuestCard />);

    await waitFor(() => expect(screen.getByText(/Proveravam Daily Quest/i)).toBeTruthy());
  });

  it("prikazuje quest podatke kada aktivan Daily Quest postoji", async () => {
    mockedUseApiClient.mockReturnValue({ listQuests: () => Promise.resolve([baseQuest]) });

    await render(<DailyQuestCard />);

    await waitFor(() => expect(screen.getByText("Zavrsi danasnji trening")).toBeTruthy());
    expect(screen.getByText(/\+500 XP/)).toBeTruthy();
  });

  it("prikazuje dugme za generisanje kada nema aktivnog Daily Quest-a", async () => {
    const generateDailyQuest = jest.fn().mockResolvedValue(baseQuest);
    mockedUseApiClient.mockReturnValue({
      listQuests: () => Promise.resolve([]),
      generateDailyQuest,
    });

    await render(<DailyQuestCard />);

    await waitFor(() => expect(screen.getByText(/jos nemas Daily Quest/i)).toBeTruthy());

    await fireEvent.press(screen.getByTestId("daily-quest-generate"));

    await waitFor(() => expect(generateDailyQuest).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Zavrsi danasnji trening")).toBeTruthy());
  });

  it("prikazuje error stanje kada zahtev ne uspe", async () => {
    mockedUseApiClient.mockReturnValue({ listQuests: () => Promise.reject(new Error("network")) });

    await render(<DailyQuestCard />);

    await waitFor(() => expect(screen.getByText(/Ne mogu da ucitam Quest/i)).toBeTruthy());
  });
});
