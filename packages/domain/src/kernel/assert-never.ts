/**
 * Koristiti u default grani switch-a nad union tipovima da compile-time
 * proveri iscrpnost svih slucajeva (npr. buduci Rank ili Quest status enumi).
 */
export function assertNever(value: never, message = "Neocekivana vrednost"): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
