/**
 * `CORS_ORIGIN` je opciono (vidi config/env.ts) - bez njega CORS dozvoljava
 * sve origin-e, isti "placeholder-friendly" princip kao ostatak env seme.
 * To je bezbedno za lokalni razvoj i za native mobile klijente (koji ne
 * salju Origin header na isti nacin kao browser), ali pred produkciju treba
 * podesiti CORS_ORIGIN na zarezom-odvojenu listu dozvoljenih origin-a
 * (npr. buduci web admin panel) da se restrikuje pristup sa browser strane.
 */
export function resolveCorsOrigin(originEnv: string | undefined): boolean | string[] {
  if (!originEnv) {
    return true;
  }
  return originEnv
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
