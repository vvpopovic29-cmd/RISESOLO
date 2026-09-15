import { Injectable } from "@nestjs/common";
import {
  allocateStatPoints,
  calculateProgress,
  calculateRank,
  computeDisplayedStreak,
  grantStatPoints,
  type Result,
  type AllocateStatPointsError,
  type PlayerStats,
  type StatKey,
  type StreakState,
} from "@risesolo/domain";
import {
  mapPlayerStatsRowToDomain,
  mapProfileRowToDomain,
  mapProgressionRowToStreak,
} from "@risesolo/validation";
import { PlayersRepository } from "./players.repository";
import type { PlayerSummary } from "./player-summary";

function todayUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

@Injectable()
export class PlayersService {
  constructor(private readonly playersRepository: PlayersRepository) {}

  async getSummary(userId: string, now: Date = new Date()): Promise<PlayerSummary> {
    const [profileRow, statsRow, progressionRow] = await Promise.all([
      this.playersRepository.getProfile(userId),
      this.playersRepository.getPlayerStats(userId),
      this.playersRepository.getProgression(userId),
    ]);

    const progress = calculateProgress(progressionRow.total_xp);
    const streak = mapProgressionRowToStreak(progressionRow);

    return {
      profile: mapProfileRowToDomain(profileRow),
      stats: mapPlayerStatsRowToDomain(statsRow),
      progression: {
        totalXp: progress.totalXp,
        level: progress.level,
        currentLevelXp: progress.currentLevelXp,
        requiredXp: progress.requiredXp,
        progressRatio: progress.progressRatio,
        rank: calculateRank(progress.level),
        coins: progressionRow.coins,
        streak: {
          current: computeDisplayedStreak(streak, todayUtc(now)),
          longest: streak.longestStreak,
        },
      },
    };
  }

  /**
   * Igrac trosi nerasporedjene poene na jedan stat. Cita trenutne statove,
   * primenjuje allocateStatPoints (Faza 1 domain pravilo - validira da ima
   * dovoljno poena), pa upisuje NOVO stanje. Backend je jedini koji sme da
   * menja player_stats (RLS to i sprovodi).
   */
  async allocateStatPoints(
    userId: string,
    statKey: StatKey,
    amount: number,
  ): Promise<Result<PlayerStats, AllocateStatPointsError>> {
    const statsRow = await this.playersRepository.getPlayerStats(userId);
    const currentStats = mapPlayerStatsRowToDomain(statsRow);

    const result = allocateStatPoints(currentStats, statKey, amount);
    if (!result.ok) {
      return result;
    }

    const updatedRow = await this.playersRepository.updatePlayerStats(userId, {
      strength: result.value.strength,
      agility: result.value.agility,
      endurance: result.value.endurance,
      vitality: result.value.vitality,
      intelligence: result.value.intelligence,
      unspent_points: result.value.unspentPoints,
    });

    return { ok: true, value: mapPlayerStatsRowToDomain(updatedRow) };
  }

  /**
   * Dodeljuje `points` nerasporedjenih stat poena posle level-upa
   * (Completion Engine, Faza 6/7 - `statPointsAwarded` u CompletionOutcome-u).
   * Za razliku od allocateStatPoints, ovo SAMO dodaje na unspent_points -
   * ne trosi ih na konkretan stat (to igrac radi naknadno, POST /players/me/stat-points).
   */
  async grantStatPoints(userId: string, points: number): Promise<PlayerStats> {
    const statsRow = await this.playersRepository.getPlayerStats(userId);
    const currentStats = mapPlayerStatsRowToDomain(statsRow);
    const updatedStats = grantStatPoints(currentStats, points);

    const updatedRow = await this.playersRepository.updatePlayerStats(userId, {
      strength: updatedStats.strength,
      agility: updatedStats.agility,
      endurance: updatedStats.endurance,
      vitality: updatedStats.vitality,
      intelligence: updatedStats.intelligence,
      unspent_points: updatedStats.unspentPoints,
    });

    return mapPlayerStatsRowToDomain(updatedRow);
  }

  /** "Pre" stanje koje Completion Engine (Faza 6) uzima kao previousTotalXp/previousCoins/previousStreak ulaz. */
  async getProgressionSnapshot(
    userId: string,
  ): Promise<{ totalXp: number; coins: number; streak: StreakState }> {
    const row = await this.playersRepository.getProgression(userId);
    return { totalXp: row.total_xp, coins: row.coins, streak: mapProgressionRowToStreak(row) };
  }

  /** Upisuje NOVO stanje posle Completion Engine poziva - jedino mesto koje sme da menja progression. */
  async applyProgressionUpdate(
    userId: string,
    update: { totalXp: number; coins: number; streak: StreakState },
  ): Promise<void> {
    await this.playersRepository.updateProgression(userId, {
      total_xp: update.totalXp,
      coins: update.coins,
      current_streak: update.streak.currentStreak,
      longest_streak: update.streak.longestStreak,
      last_activity_date: update.streak.lastActivityDate,
    });
  }
}
