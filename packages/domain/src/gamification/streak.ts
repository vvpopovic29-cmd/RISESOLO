/**
 * Streak = broj uzastopnih dana sa zavrsenom obaveznom dnevnom aktivnoscu.
 * Penalty Quest (FAZA "kasnije") namerno nije uveden - ovde je samo osnovno
 * pravilo: propusten dan lomi streak na 0/1.
 */

/**
 * Racuna novi streak nakon sto je igrac zavrsio dananjnju aktivnost.
 *
 * @param previousStreak trenutna sacuvana vrednost streak-a
 * @param daysSinceLastCompletion broj dana od poslednjeg zavrsetka do danas
 *   (0 = vec zavrseno danas, 1 = zavrseno juce, null = nikad ranije zavrseno)
 */
export function computeStreakAfterCompletion(previousStreak: number, daysSinceLastCompletion: number | null): number {
  if (daysSinceLastCompletion === null) {
    return 1;
  }
  if (daysSinceLastCompletion === 0) {
    // Vec zavrseno danas - idempotentno, ne dupliramo streak (ni XP - to se
    // garantuje odvojeno preko unique constraint-a na xp_events).
    return previousStreak;
  }
  if (daysSinceLastCompletion === 1) {
    return previousStreak + 1;
  }
  // Propusten je bar jedan ceo dan - streak je slomljen, danasnji zavrsetak pocinje nov streak.
  return 1;
}

/** Da li je streak i dalje "ziv" za prikaz (nije propusten dan bez zavrsetka). */
export function isStreakActive(daysSinceLastCompletion: number | null): boolean {
  return daysSinceLastCompletion !== null && daysSinceLastCompletion <= 1;
}
