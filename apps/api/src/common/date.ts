/** Skida vreme sa datuma (UTC ponoc) - koristi se za dnevne granice (quest datum, streak racunanje). */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Broj celih dana izmedju dva datuma (a - b), oba normalizovana na UTC ponoc. */
export function diffInUtcDays(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfUtcDay(a).getTime() - startOfUtcDay(b).getTime()) / msPerDay);
}

/** Ponedeljak 00:00 UTC ISO nedelje koja sadrzi dati datum - koristi se kao Boss Quest "datum" (nedeljna granica). */
export function startOfIsoWeek(date: Date): Date {
  const day = startOfUtcDay(date);
  const weekday = day.getUTCDay(); // 0=nedelja..6=subota
  const daysSinceMonday = (weekday + 6) % 7; // ponedeljak=0
  return new Date(day.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
}
