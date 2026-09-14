# RISESOLO — Supabase (Faza 2 — Database)

Ovaj folder prati (verzioniše) šemu koja živi u Supabase projektu
**"RISESOLO"** (`whswkyqewatdgewnknun`, region `eu-west-1`,
`https://whswkyqewatdgewnknun.supabase.co`).

## Šta se ovde desilo

Projekat je zatečen sa potpuno drugačijom, raspoloživom "prototip" šemom
(`players`, `xp_transactions`, stari `quests`/`exercises`/`workouts`,
plus Nutrition/Achievements/Training Plans sistemi — sve van MVP obima).
Po eksplicitnom dogovoru, ta šema je **zamenjena** čistom MVP šemom koja
1:1 prati ono što je zaključano u `packages/domain` (Faza 1, 3, 4, 5, 6).
Nije bilo pravih korisničkih podataka u riziku (`players: 0 redova`) —
`exercises`/`achievements` su bili samo seed/referentni sadržaj.

## Migracije (`migrations/`)

Primenjene redom, `<timestamp>_<name>.sql`:

| Migracija | Šta radi |
| --- | --- |
| `drop_legacy_prototype_schema` | Uklanja prototip (tabele, funkcije, `auth.users` trigger) |
| `create_profiles_and_progression` | `profiles`, `player_stats`, `progression`, `xp_events` + signup trigger (Faza 1) |
| `create_exercise_library` | `exercises`, `skill_lines`, `skill_steps`, `progression_chains` (Faza 4) |
| `create_quests` | `quests` — Daily Quest instance (Faza 3) |
| `create_workouts` | `workout_templates(_exercises)`, `workout_sessions(_exercises)`, `workout_sets` (Faza 5) |
| `fix_fn_set_updated_at_search_path` | Security advisor ispravka (mutable search_path) |
| `performance_fixes_rls_and_indexes` | `auth.uid()` → `(select auth.uid())`, nedostajući FK indeksi, razdvajanje `for all` policy-ja od select-a |

Nakon primene: **0 security advisor nalaza**, samo INFO-level "unused index"
(očekivano — baza još nema saobraćaj).

## Ključne arhitektonske odluke

- **`total_xp` je source of truth; `level` i `rank` su DERIVED.** Ne
  postoje kao kolone — računaju se u `apps/api` iz
  `calculateLevel`/`calculateRank` (`@risesolo/domain`). Sprečava drift
  opisan u `packages/domain/src/progression/README.md`.
- **Server je jedini autoritet.** `player_stats`, `progression`,
  `xp_events`, `quests` nemaju nikakav klijentski INSERT/UPDATE/DELETE —
  samo `SELECT` sopstvenog reda. Sve mutacije idu kroz `apps/api`
  koristeći `SUPABASE_SERVICE_ROLE_KEY` (zaobilazi RLS), pozivajući
  domain funkcije (`completeWorkout`, `allocateStatPoints`, ...) pa tek
  onda upisujući rezultat.
- **`workout_sessions.status → 'COMPLETED'` je isključivo service_role
  prelaz** — RLS `WITH CHECK` eksplicitno to blokira za `authenticated`
  korisnika (`status <> 'COMPLETED'`). Korisnik SME sam da loguje setove
  dok je sesija `IN_PROGRESS`; sam XP se računa tek kad backend (Faza 6
  Completion Engine) zatvori sesiju iz stvarno upisanih setova.
- **`QUEST_DEFINITIONS` katalog ostaje u kodu**
  (`packages/domain/src/quests/definitions.ts`), ne u bazi — `quests`
  tabela čuva samo generisane dnevne instance.

## Seed sadržaj

`exercises`/`skill_lines`/`skill_steps`/`progression_chains` su
seedovani iz `data/exercises/*.json` (240 vežbi, 8 skill linija, 41
koraka, 1 progression chain) — isti podaci validirani u
`packages/validation/src/contracts/exercise.data.test.ts`. Seed je urađen
ručno ovom sesijom (serija `apply_migration` poziva); nije još automatizovan
kao skripta koju CI/lokalni dev može ponovo pokrenuti. **TODO**: napisati
`apps/api` seed skriptu (ili `scripts/seed-exercises.ts`) koja čita
`data/exercises/*.json`, validira preko `exerciseLibraryFileSchema` +
`mapExerciseDtoToDomain` (`@risesolo/validation`), i upisuje preko
Supabase service-role klijenta — zameniće ovaj ručni korak i učiniti
sledeći fresh-projekat setup ponovljivim.

## Environment

Pogledaj `.env.example` (root) za `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` (`apps/api`, **nikad** na klijentu) i
`EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` (`apps/mobile`,
javno bezbedni — ograničeni RLS-om).

## Šta NIJE ovde (namerno)

- Stvarno povezivanje `apps/api`/`apps/mobile` sa Supabase klijentom
  (Supabase JS SDK bootstrap, Auth flow) — env šema je spremna, ali
  kod koji je koristi je Faza 10 (Auth + Onboarding).
- RLS finalni bezbednosni audit sa penetration-style testovima (Faza 12)
  — ovo je solidna MVP osnova, ne zamena za taj korak.
