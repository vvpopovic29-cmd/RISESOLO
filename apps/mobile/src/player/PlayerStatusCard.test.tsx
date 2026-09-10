import { render, screen, waitFor } from "@testing-library/react-native";
import type { PlayerResponse } from "@risesolo/validation";
import { PlayerStatusCard } from "./PlayerStatusCard";
import { useApiClient } from "../api/use-api-client";

jest.mock("../api/use-api-client", () => ({
  useApiClient: jest.fn(),
}));

const mockedUseApiClient = useApiClient as jest.Mock;

const basePlayer: PlayerResponse = {
  id: "00000000-0000-0000-0000-000000000001",
  displayName: "Vukasin",
  level: 3,
  xp: 400,
  xpToNextLevel: 500,
  statPointsAvailable: 2,
  rank: "D",
  class: null,
  coins: 120,
  hp: 100,
  strength: 4,
  agility: 3,
  endurance: 3,
  vitality: 2,
  intelligence: 1,
  currentStreak: 5,
  longestStreak: 5,
  lastActivityDate: "2026-01-01",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("PlayerStatusCard", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("prikazuje loading stanje pre nego sto se zahtev zavrsi", async () => {
    mockedUseApiClient.mockReturnValue({ getPlayer: () => new Promise(() => {}) });

    render(<PlayerStatusCard />);

    await waitFor(() => expect(screen.getByText(/Ucitavanje Player statusa/i)).toBeTruthy());
  });

  it("prikazuje Player podatke kada zahtev uspe", async () => {
    mockedUseApiClient.mockReturnValue({ getPlayer: () => Promise.resolve(basePlayer) });

    render(<PlayerStatusCard />);

    await waitFor(() => expect(screen.getByText("Vukasin")).toBeTruthy());
    expect(screen.getByText("Rank D")).toBeTruthy();
    expect(screen.getByText("Level 3")).toBeTruthy();
    expect(screen.getByText(/\+2 Stat Points dostupno/)).toBeTruthy();
  });

  it("prikazuje error stanje i dugme za ponovni pokusaj kada zahtev ne uspe", async () => {
    mockedUseApiClient.mockReturnValue({ getPlayer: () => Promise.reject(new Error("network")) });

    render(<PlayerStatusCard />);

    await waitFor(() => expect(screen.getByText(/Ne mogu da ucitam Player status/i)).toBeTruthy());
    expect(screen.getByText(/Pokusaj ponovo/i)).toBeTruthy();
  });
});
