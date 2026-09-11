export interface SetPerformance {
  readonly weightKg: number;
  readonly reps: number;
}

export type ProgressTrend = "up" | "down" | "flat" | "insufficient_data";

export type StagnationStatus = "insufficient_data" | "progressing" | "stagnating" | "regressing";

/**
 * Epley formula za procenu 1RM (Personal Record procena). Za reps = 1
 * vraca samu tezinu (nema ekstrapolacije potrebne).
 */
export function estimated1Rm(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || weightKg < 0) {
    throw new RangeError(`weightKg mora biti nenegativan broj, dobijeno: ${weightKg}`);
  }
  if (!Number.isInteger(reps) || reps < 1) {
    throw new RangeError(`reps mora biti pozitivan ceo broj, dobijeno: ${reps}`);
  }

  if (reps === 1) {
    return weightKg;
  }

  return weightKg * (1 + reps / 30);
}

/** Najveca procenjena 1RM medju svim serijama jedne trening sesije. */
export function topEstimated1Rm(sets: readonly SetPerformance[]): number {
  if (sets.length === 0) {
    throw new RangeError("sets ne sme biti prazan niz");
  }

  return Math.max(...sets.map((set) => estimated1Rm(set.weightKg, set.reps)));
}

/**
 * Poredi "top set" (najveca procenjena 1RM) najnovije trening sesije sa
 * prethodnom da odredi da li vezba napreduje, stagnira ili nazaduje -
 * Progressive Overload signal. Sesije se ocekuju hronoloski sortirane
 * (najstarija prva); orkestracija upita (grupisanje serija po treningu) je
 * na servisu, ova funkcija je cista.
 */
export function computeProgressTrend(
  sessions: readonly (readonly SetPerformance[])[],
): ProgressTrend {
  if (sessions.length < 2) {
    return "insufficient_data";
  }

  const latestSession = sessions[sessions.length - 1];
  const previousSession = sessions[sessions.length - 2];
  if (!latestSession || !previousSession) {
    return "insufficient_data";
  }

  const latest = topEstimated1Rm(latestSession);
  const previous = topEstimated1Rm(previousSession);

  if (latest > previous) {
    return "up";
  }
  if (latest < previous) {
    return "down";
  }
  return "flat";
}

/**
 * "System AI" signal: gleda poslednjih `windowSize` sesija (podrazumevano
 * 3) umesto samo poslednje dve kao `computeProgressTrend` - manje osetljivo
 * na jednokratni losiji trening. Strogo rastuce u prozoru -> "progressing",
 * strogo opadajuce -> "regressing", sve ostalo (ravno ili mesovito) ->
 * "stagnating" (signal da je vreme za promenu programa/tezine/ponavljanja).
 */
export function detectStagnation(
  sessions: readonly (readonly SetPerformance[])[],
  windowSize = 3,
): StagnationStatus {
  if (sessions.length < windowSize) {
    return "insufficient_data";
  }

  const recentTopLifts = sessions.slice(-windowSize).map(topEstimated1Rm);

  let hasIncrease = false;
  let hasDecrease = false;
  for (let i = 1; i < recentTopLifts.length; i++) {
    const current = recentTopLifts[i];
    const prior = recentTopLifts[i - 1];
    if (current === undefined || prior === undefined) {
      continue;
    }
    if (current > prior) {
      hasIncrease = true;
    } else if (current < prior) {
      hasDecrease = true;
    }
  }

  if (hasIncrease && !hasDecrease) {
    return "progressing";
  }
  if (hasDecrease && !hasIncrease) {
    return "regressing";
  }
  return "stagnating";
}
