import type { StreakState } from "@risesolo/domain";
import type { ProgressionRow } from "../contracts/progression";

export function mapProgressionRowToStreak(row: ProgressionRow): StreakState {
  return {
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastActivityDate: row.last_activity_date,
  };
}
