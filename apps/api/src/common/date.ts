/** Skida vreme sa datuma (UTC ponoc) - koristi se za dnevne granice (quest datum, streak racunanje). */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Broj celih dana izmedju dva datuma (a - b), oba normalizovana na UTC ponoc. */
export function diffInUtcDays(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfUtcDay(a).getTime() - startOfUtcDay(b).getTime()) / msPerDay);
}
