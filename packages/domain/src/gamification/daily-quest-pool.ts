/**
 * Pool mogucih dnevnih questova - do sada je postojao SAMO jedan hardkodovan
 * dnevni quest ("zavrsi trening"). Ovo uvodi varijetet dok ostaje na
 * postojecim podacima (trening, ishrana) - bez novih tracking podsistema
 * (koraci/hidratacija/san namerno van obima, zahtevaju sopstvenu infrastrukturu).
 */
export const DAILY_QUEST_KINDS = ["WORKOUT_COMPLETE", "LOG_NUTRITION"] as const;
export type DailyQuestKind = (typeof DAILY_QUEST_KINDS)[number];

/**
 * Deterministicki izbor po (userId, datum) - isti korisnik uvek dobija isti
 * kind za isti dan (bitno jer generateDailyQuest mora ostati idempotentan
 * bez cuvanja posebnog "seed"-a), a razliciti korisnici/dani prirodno
 * variraju preko hash-a. Nije kriptografski hash - samo stabilna raspodela.
 */
export function selectDailyQuestKind(userId: string, date: Date): DailyQuestKind {
  const seed = `${userId}:${date.toISOString().slice(0, 10)}`;
  const hash = hashSeed(seed);
  // hash % length je uvek u granicama niza - noUncheckedIndexedAccess ovo ne vidi.
  return DAILY_QUEST_KINDS[hash % DAILY_QUEST_KINDS.length] as DailyQuestKind;
}

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
