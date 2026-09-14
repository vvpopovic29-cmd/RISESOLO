/**
 * Streak (Faza 9 - STREAK, MINIMALNI PREVIEW).
 *
 * Ovo NIJE puna Faza 9 (Penalty Quest, streak freeze/recovery) - to je
 * namerno odlozeno. Ovo je samo "update-on-activity" pravilo koje je
 * Fazi 6 (Completion Engine) potrebno da vrati `streak` iz svog odgovora.
 *
 * Pravilo (iz plana):
 *   complete today's required activity -> streak + 1
 *   ako korisnik preskoci dan -> streak -> 0
 *
 * MVP nema cron koji "gasi" streak na pocetku propustenog dana - umesto
 * toga, computeDisplayedStreak() LENJO racuna da li je streak jos zivo
 * (isti princip kao hasExpired() u Fazi 3 - Quest): UI/backend na svakom
 * citanju racuna stvarni prikazani streak iz sacuvanog stanja + danasnjeg
 * datuma, bez potrebe za pozadinskim job-om koji bi ga eksplicitno resetovao.
 */
import type { StreakState } from "./streak.types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertValidDate(date: string, label: string): void {
  if (!DATE_PATTERN.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00.000Z`))) {
    throw new RangeError(`${label} mora biti validan YYYY-MM-DD string, dobijeno: ${date}`);
  }
}

function addUtcDays(date: string, days: number): string {
  const ms = Date.parse(`${date}T00:00:00.000Z`) + days * 86_400_000;
  const iso = new Date(ms).toISOString();
  return iso.slice(0, 10);
}

export function createInitialStreak(): StreakState {
  return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
}

/**
 * Prijavljuje aktivnost za dati dan. Idempotentno unutar istog dana (druga
 * aktivnost istog dana ne duplira streak). Ako je poslednja aktivnost bila
 * juce, streak raste; inace (prvi put, ili posle propustenog dana) streak
 * pocinje iznova od 1.
 */
export function updateStreakForActivity(state: StreakState, activityDate: string): StreakState {
  assertValidDate(activityDate, "activityDate");

  if (state.lastActivityDate === activityDate) {
    return state;
  }

  const yesterday = addUtcDays(activityDate, -1);
  const newCurrent = state.lastActivityDate === yesterday ? state.currentStreak + 1 : 1;

  return {
    currentStreak: newCurrent,
    longestStreak: Math.max(state.longestStreak, newCurrent),
    lastActivityDate: activityDate,
  };
}

/**
 * "Stvaran" streak za prikaz na dati dan - 0 ako je poslednja aktivnost
 * bila pre vise od jednog dana (streak je logicki prekinut, cak i ako to
 * jos nije upisano u bazu). Poziva se na citanju (Dashboard), NE menja
 * sacuvano stanje.
 */
export function computeDisplayedStreak(state: StreakState, today: string): number {
  assertValidDate(today, "today");
  if (state.lastActivityDate === null) return 0;
  const yesterday = addUtcDays(today, -1);
  const isAlive = state.lastActivityDate === today || state.lastActivityDate === yesterday;
  return isAlive ? state.currentStreak : 0;
}
