export interface StreakState {
  readonly currentStreak: number;
  readonly longestStreak: number;
  /** ISO datum (YYYY-MM-DD) poslednje aktivnosti koja je racunata u streak, ili null. */
  readonly lastActivityDate: string | null;
}
