/**
 * XP potrebno da igrac predje sa datog nivoa na sledeci.
 *
 * Formula: XP = Level^2 * 100. Ovo je jedini izvor istine za formulu na
 * TypeScript strani; ista formula je duplirana u fn_grant_xp
 * (supabase/migrations/..._gamification_core_schema.sql) jer level-up mora
 * biti izracunat atomski unutar baze da bi ostao tacan pod konkurentnim
 * XP grantovima. Ako se formula ikad promeni, promeniti je na oba mesta.
 */
export function xpRequiredForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError(`level mora biti pozitivan ceo broj, dobijeno: ${level}`);
  }

  return level ** 2 * 100;
}
