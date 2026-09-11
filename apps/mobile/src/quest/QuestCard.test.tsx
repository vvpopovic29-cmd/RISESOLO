import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { QuestResponse } from "@risesolo/validation";
import { QuestCard } from "./QuestCard";
import { useApiClient } from "../api/use-api-client";

jest.mock("../api/use-api-client", () => ({
  useApiClient: jest.fn(),
}));

const mockedUseApiClient = useApiClient as jest.Mock;

const weeklyQuest: QuestResponse = {
  id: "00000000-0000-0000-0000-000000000003",
  type: "weekly",
  title: "Zavrsi 5 treninga ove nedelje",
  description: "Zabelezi 5 treninga do kraja nedelje za veliku nagradu.",
  linkedAction: "workout",
  targetCount: 5,
  progressCount: 2,
  xpReward: 2000,
  coinReward: 150,
  status: "active",
  expiresAt: null,
  completedAt: null,
  createdAt: new Date().toISOString(),
};

const baseProps = {
  testID: "weekly-quest",
  type: "weekly" as const,
  linkedAction: "workout" as const,
  label: "Weekly Quest",
  loadingText: "Proveravam Weekly Quest...",
  emptyText: "Ove nedelje jos nemas Weekly Quest.",
  generateButtonText: "Generisi Weekly Quest",
  errorPrefix: "Ne mogu da ucitam Weekly Quest",
};

describe("QuestCard", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("prikazuje loading stanje pre nego sto se zahtev zavrsi", async () => {
    mockedUseApiClient.mockReturnValue({ listQuests: () => new Promise(() => {}) });

    await render(
      <QuestCard {...baseProps} generate={(apiClient) => apiClient.generateWeeklyQuest()} />,
    );

    await waitFor(() => expect(screen.getByText(/Proveravam Weekly Quest/i)).toBeTruthy());
  });

  it("prikazuje quest podatke kada aktivan quest za dati (type, linkedAction) postoji", async () => {
    mockedUseApiClient.mockReturnValue({ listQuests: () => Promise.resolve([weeklyQuest]) });

    await render(
      <QuestCard {...baseProps} generate={(apiClient) => apiClient.generateWeeklyQuest()} />,
    );

    await waitFor(() => expect(screen.getByText("Zavrsi 5 treninga ove nedelje")).toBeTruthy());
    expect(screen.getByText(/\+2000 XP/)).toBeTruthy();
    expect(screen.getByText("Progres: 2 / 5")).toBeTruthy();
  });

  it("prikazuje dugme za generisanje kada nema aktivnog questa i poziva generate()", async () => {
    const generateWeeklyQuest = jest.fn().mockResolvedValue(weeklyQuest);
    mockedUseApiClient.mockReturnValue({
      listQuests: () => Promise.resolve([]),
      generateWeeklyQuest,
    });

    await render(
      <QuestCard {...baseProps} generate={(apiClient) => apiClient.generateWeeklyQuest()} />,
    );

    await waitFor(() => expect(screen.getByText(/jos nemas Weekly Quest/i)).toBeTruthy());

    await fireEvent.press(screen.getByTestId("weekly-quest-generate"));

    await waitFor(() => expect(generateWeeklyQuest).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Zavrsi 5 treninga ove nedelje")).toBeTruthy());
  });

  it("prikazuje error stanje kada zahtev ne uspe", async () => {
    mockedUseApiClient.mockReturnValue({ listQuests: () => Promise.reject(new Error("network")) });

    await render(
      <QuestCard {...baseProps} generate={(apiClient) => apiClient.generateWeeklyQuest()} />,
    );

    await waitFor(() => expect(screen.getByText(/Ne mogu da ucitam Weekly Quest/i)).toBeTruthy());
  });
});
