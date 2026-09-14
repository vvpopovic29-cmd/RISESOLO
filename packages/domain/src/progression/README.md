# Faza 1 — Zaključavanje pravila sistema

Pravila implementirana ovde su **jedini** izvor istine za XP/Level/Rank/Stat
obračun. Nijedan ekran ili API handler ne sme računati ove vrednosti
samostalno — uvek pozivom ovih funkcija.

## 1. XP sistem (`xp.ts`)

- Formula (zadata): `XP required (za sledeći nivo) = Level² × 100`.
- `total_xp` je **source of truth**; `level` je **derived** (uvek se računa
  iz `total_xp`, nikad ne čuva svoju "istinu" nezavisno — sprečava bug gde
  `total_xp = 5000` a `level` ostane zaglavljen na starijoj vrednosti).
- Funkcije: `calculateLevel(totalXp)`, `calculateCurrentLevelXp(totalXp)`,
  `calculateRequiredXp(level)`, `calculateProgress(totalXp)`,
  `calculateTotalXpForLevel(level)` (kumulativni prag), `applyXpGain(prevTotalXp, xpGained)`.
- `applyXpGain` je čista funkcija: isti ulaz → uvek isti izlaz. Ona **ne**
  rešava idempotenciju XP eventova (dupli request koji ne sme dati XP
  dvaput) — to je odgovornost `xp_events` tabele sa unique constraint-om
  na `(source, source_id)`, koja dolazi u Fazi 2 (Database) / Fazi 6
  (Completion Engine). Ova funkcija samo garantuje da *jedna* primena XP-a
  uvek daje predvidljiv, testiran rezultat.

## 2. Rank sistem (`rank.ts`)

- Odluka za MVP: **Rank = deterministička funkcija Level-a** (bez
  performance/achievement/consistency faktora — to je Faza 2+ proširenje).
- `E → D → C → B → A → S`, pragovi: E(1) D(10) C(20) B(30) A(40) S(50).
- `MONARCH` namerno izostavljen dok se ne definiše šta ga otključava.

## 3. Stat sistem (`stats.ts`)

- Odluka za MVP (opcija C iz plana): **Level Up → Stat Points → igrač sam
  raspoređuje poene** na `STRENGTH / AGILITY / ENDURANCE / VITALITY / INTELLIGENCE`.
- Trening **ne** menja statove direktno — trening daje XP, XP daje Level,
  Level daje stat poene, igrač svesno raspoređuje. Ovo daje "pravi" RPG
  osećaj i sprečava da nasumičan trening nasumično menja karakter.
- `STAT_POINTS_PER_LEVEL = 3` (konstanta — menjati ovde ako se balans promeni).
- `allocateStatPoints` je jedino mesto koje sme da promeni vrednost stata;
  vraća `Result` (ne baca exception za očekivane slučajeve poput
  "nema dovoljno poena") i nikad ne mutira ulazni objekat.

## Šta NIJE ovde (namerno)

- Perzistencija (Supabase tabele, RLS) — Faza 2.
- Idempotency/duplicate-event zaštita na nivou API-ja — Faza 2/6.
- Quest/Workout/Streak logika — Faza 3/5/6/9, koristiće ove funkcije kao
  gradivne blokove.
