/**
 * Deterministicki (non-cryptographic) string hash - FNV-1a 32-bit.
 * Koristi se gde treba isti, ponovljiv izbor iz nekog skupa na osnovu
 * ulaznog stringa (npr. deterministicki izbor Daily Quest-a za dati
 * user+date, bez oslanjanja na Math.random ili DB round-trip).
 */
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function fnv1aHash(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

/** Deterministicki bira indeks u [0, length) na osnovu seed stringa. */
export function seededIndex(seed: string, length: number): number {
  if (!Number.isInteger(length) || length <= 0) {
    throw new RangeError(`length mora biti pozitivan ceo broj, dobijeno: ${length}`);
  }
  return fnv1aHash(seed) % length;
}
