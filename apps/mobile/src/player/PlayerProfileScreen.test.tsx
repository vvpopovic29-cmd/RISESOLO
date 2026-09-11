import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { PlayerResponse } from "@risesolo/validation";
import { PlayerProfileScreen } from "./PlayerProfileScreen";
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

describe("PlayerProfileScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("popunjava formu trenutnim podacima igraca", async () => {
    mockedUseApiClient.mockReturnValue({ getPlayer: () => Promise.resolve(basePlayer) });

    await render(<PlayerProfileScreen />);

    await waitFor(() =>
      expect(screen.getByTestId("player-profile-display-name-input").props.value).toBe("Vukasin"),
    );
    expect(screen.getByText("2 dostupno")).toBeTruthy();
  });

  it("bira Class i cuva profil", async () => {
    const updatePlayer = jest.fn().mockResolvedValue({ ...basePlayer, class: "strength_hunter" });
    const getPlayer = jest
      .fn()
      .mockResolvedValueOnce(basePlayer)
      .mockResolvedValueOnce({ ...basePlayer, class: "strength_hunter" });
    mockedUseApiClient.mockReturnValue({ getPlayer, updatePlayer });

    await render(<PlayerProfileScreen />);

    await waitFor(() =>
      expect(screen.getByTestId("player-profile-class-strength_hunter")).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId("player-profile-class-strength_hunter"));
    await fireEvent.press(screen.getByTestId("player-profile-save"));

    await waitFor(() =>
      expect(updatePlayer).toHaveBeenCalledWith({
        displayName: "Vukasin",
        class: "strength_hunter",
      }),
    );
    await waitFor(() => expect(getPlayer).toHaveBeenCalledTimes(2));
  });

  it("dodeljuje stat poen na dugme +1", async () => {
    const allocateStatPoints = jest
      .fn()
      .mockResolvedValue({ ...basePlayer, strength: 5, statPointsAvailable: 1 });
    const getPlayer = jest
      .fn()
      .mockResolvedValueOnce(basePlayer)
      .mockResolvedValueOnce({ ...basePlayer, strength: 5, statPointsAvailable: 1 });
    mockedUseApiClient.mockReturnValue({ getPlayer, allocateStatPoints });

    await render(<PlayerProfileScreen />);

    await waitFor(() =>
      expect(screen.getByTestId("player-profile-allocate-strength")).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId("player-profile-allocate-strength"));

    await waitFor(() =>
      expect(allocateStatPoints).toHaveBeenCalledWith({ stat: "strength", points: 1 }),
    );
    await waitFor(() => expect(getPlayer).toHaveBeenCalledTimes(2));
  });

  it("onemogucava dodelu stat poena kada nema dostupnih", async () => {
    mockedUseApiClient.mockReturnValue({
      getPlayer: () => Promise.resolve({ ...basePlayer, statPointsAvailable: 0 }),
    });

    await render(<PlayerProfileScreen />);

    await waitFor(() =>
      expect(screen.getByTestId("player-profile-allocate-strength")).toBeTruthy(),
    );
    expect(
      screen.getByTestId("player-profile-allocate-strength").props.accessibilityState.disabled,
    ).toBe(true);
  });

  it("prikazuje gresku kada cuvanje profila ne uspe", async () => {
    const updatePlayer = jest.fn().mockRejectedValue(new Error("network"));
    mockedUseApiClient.mockReturnValue({
      getPlayer: () => Promise.resolve(basePlayer),
      updatePlayer,
    });

    await render(<PlayerProfileScreen />);

    await waitFor(() => expect(screen.getByTestId("player-profile-save")).toBeTruthy());
    await fireEvent.press(screen.getByTestId("player-profile-save"));

    await waitFor(() => expect(screen.getByTestId("player-profile-save-error")).toBeTruthy());
  });
});
