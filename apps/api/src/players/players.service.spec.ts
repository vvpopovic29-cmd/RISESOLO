import { PlayersService } from "./players.service";
import type { PlayersRepository } from "./players.repository";
import type { ProfileRow, PlayerStatsRow, ProgressionRow } from "@risesolo/validation";

const PROFILE_ROW: ProfileRow = {
  id: "u1",
  username: "hunter_u1",
  avatar_url: null,
  created_at: "2026-09-14T00:00:00.000Z",
  updated_at: "2026-09-14T00:00:00.000Z",
};

const STATS_ROW: PlayerStatsRow = {
  user_id: "u1",
  strength: 5,
  agility: 5,
  endurance: 5,
  vitality: 5,
  intelligence: 5,
  unspent_points: 3,
  updated_at: "2026-09-14T00:00:00.000Z",
};

const PROGRESSION_ROW: ProgressionRow = {
  user_id: "u1",
  total_xp: 250,
  coins: 12,
  current_streak: 4,
  longest_streak: 10,
  last_activity_date: "2026-09-14",
  updated_at: "2026-09-14T00:00:00.000Z",
};

function makeRepository(overrides: Partial<jest.Mocked<PlayersRepository>> = {}) {
  return {
    getProfile: jest.fn().mockResolvedValue(PROFILE_ROW),
    getPlayerStats: jest.fn().mockResolvedValue(STATS_ROW),
    getProgression: jest.fn().mockResolvedValue(PROGRESSION_ROW),
    updatePlayerStats: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<PlayersRepository>;
}

describe("PlayersService.getSummary", () => {
  it("kombinuje profile/stats/progression i racuna level/rank/streak preko domain funkcija", async () => {
    const repository = makeRepository();
    const service = new PlayersService(repository);

    const summary = await service.getSummary("u1", new Date("2026-09-14T12:00:00.000Z"));

    expect(summary.profile.username).toBe("hunter_u1");
    expect(summary.stats.unspentPoints).toBe(3);
    expect(summary.progression.totalXp).toBe(250);
    expect(summary.progression.level).toBe(2); // calculateLevel(250) -> level 2 (prag 100 za level2, 500 za level3)
    expect(summary.progression.rank).toBe("E");
    expect(summary.progression.coins).toBe(12);
    expect(summary.progression.streak.current).toBe(4); // poslednja aktivnost danas -> streak "ziv"
    expect(summary.progression.streak.longest).toBe(10);
  });

  it("streak.current je 0 ako je poslednja aktivnost pre 2+ dana (lenjo racunanje)", async () => {
    const repository = makeRepository({
      getProgression: jest
        .fn()
        .mockResolvedValue({ ...PROGRESSION_ROW, last_activity_date: "2026-09-01" }),
    });
    const service = new PlayersService(repository);

    const summary = await service.getSummary("u1", new Date("2026-09-14T12:00:00.000Z"));
    expect(summary.progression.streak.current).toBe(0);
    expect(summary.progression.streak.longest).toBe(10);
  });
});

describe("PlayersService.allocateStatPoints", () => {
  it("cita statove, primenjuje allocateStatPoints, upisuje novo stanje", async () => {
    const updatedRow: PlayerStatsRow = { ...STATS_ROW, strength: 7, unspent_points: 1 };
    const repository = makeRepository({
      updatePlayerStats: jest.fn().mockResolvedValue(updatedRow),
    });
    const service = new PlayersService(repository);

    const result = await service.allocateStatPoints("u1", "STRENGTH", 2);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.strength).toBe(7);
      expect(result.value.unspentPoints).toBe(1);
    }
    expect(repository.updatePlayerStats).toHaveBeenCalledWith("u1", {
      strength: 7,
      agility: 5,
      endurance: 5,
      vitality: 5,
      intelligence: 5,
      unspent_points: 1,
    });
  });

  it("vraca gresku bez upisa kada nema dovoljno nerasporedjenih poena", async () => {
    const repository = makeRepository();
    const service = new PlayersService(repository);

    const result = await service.allocateStatPoints("u1", "STRENGTH", 10);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ reason: "INSUFFICIENT_POINTS", requested: 10, available: 3 });
    }
    expect(repository.updatePlayerStats).not.toHaveBeenCalled();
  });
});

describe("PlayersService.grantStatPoints", () => {
  it("dodaje poene na unspent_points bez trosenja na konkretan stat", async () => {
    const updatedRow: PlayerStatsRow = { ...STATS_ROW, unspent_points: 6 };
    const repository = makeRepository({
      updatePlayerStats: jest.fn().mockResolvedValue(updatedRow),
    });
    const service = new PlayersService(repository);

    const result = await service.grantStatPoints("u1", 3);

    expect(result.unspentPoints).toBe(6);
    expect(repository.updatePlayerStats).toHaveBeenCalledWith("u1", {
      strength: 5,
      agility: 5,
      endurance: 5,
      vitality: 5,
      intelligence: 5,
      unspent_points: 6,
    });
  });
});
