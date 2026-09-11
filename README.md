# RISESOLO

Gamifikovana fitness aplikacija (System RPG estetika, bez kopiranja tuđih
zaštićenih vizuelnih elemenata). Ovaj repo je pnpm/Turborepo monorepo.

> **Faza 1:** monorepo i razvojno okruženje - workspace, deljeni tooling,
> environment validacija i health-check rute.
>
> **Faza 2:** Gamification core - Player → Stats → XP → Level → Daily Quest →
> Workout → Rewards, na Supabase Postgres (projekat "RISESOLO").
>
> **Faza 3:** prošireni Exercise Database (difficulty, uputstva, alternativne
> vežbe), Progressive Overload signal, Nutrition System (kalorije/makroi/voda
> + Nutrition XP), i mobile Supabase Auth + System Status ekran povezan na
> pravi API.
>
> **Faza 4:** mobile ekrani za workout/nutrition logging, Achievements/Titles
> sistem (katalog + automatsko otključavanje preko `fn_evaluate_achievements`),
> i Progressive Overload grafikon na mobilnom.
>
> **Faza 5 (trenutno stanje):** Weekly i Side questovi (uz postojeći Daily),
> lenja ekspiracija isteklih questova (`fn_expire_stale_quests`), i
> Nutrition/Water questovi sada zaista auto-progresuju (`fn_log_meal`/
> `fn_log_water` su dobile isti auto-progres mehanizam koji je `fn_log_workout`
> već imao). Ostale poslovne funkcije (System AI, formalna Rank
> Examination/Class evolucija, Dungeons/Bosses, community/guild) dolaze u
> narednim fazama - videti "Poznata ograničenja" ispod.

## Struktura

```
apps/
  api/      NestJS - REST API (Player/Quest/Workout/Nutrition/Achievements)
  mobile/   Expo (React Native + TypeScript + Expo Router + NativeWind)
packages/
  domain/        domain kernel (Brand/Result/assertNever) + gamification (XP/Level) + training (Progressive Overload)
  validation/    deljene Zod seme, env-loader, gamification + nutrition + achievement DTO
  design-tokens/ boje (dark/light), spacing, tipografija + NativeWind preset
  api-client/    tipizovan fetch klijent (auth header injection) sa runtime validacijom odgovora
supabase/
  migrations/    SQL migracije (tabele, RLS politike, SECURITY DEFINER RPC funkcije)
```

## Preduslovi

- Node.js `>=20` (videti `.nvmrc`)
- pnpm `12.3.4` (repo koristi `packageManager` polje - `corepack enable && corepack prepare pnpm@12.3.4 --activate`)

## Komande

Sve komande se pokreću iz korena repoa (Turborepo prosleđuje zadatke svakom paketu/app-u).

```bash
pnpm install          # instalira sve zavisnosti u workspace-u
pnpm dev              # pokreće dev servere (api + mobile) - persistent, po potrebi
pnpm build            # build svih paketa i aplikacija
pnpm lint             # ESLint (deljeni flat config iz korena) za ceo repo
pnpm typecheck        # tsc --noEmit za ceo repo
pnpm test             # jedinicni i integracioni testovi za ceo repo
pnpm format           # Prettier - upisuje formatiranje
pnpm format:check     # Prettier - samo proverava (koristi se lokalno pre commit-a)
```

Pojedinačan paket/app (Turborepo filter):

```bash
pnpm --filter @risesolo/api start:dev
pnpm --filter @risesolo/mobile start
```

## Environment

1. Kopirati `.env.example` u `.env` u korenu repoa (koristi ga `apps/api`).
2. Kopirati `apps/mobile/.env.example` u `apps/mobile/.env` (Expo CLI čita
   `.env` samo iz korena te aplikacije, ne iz korena monorepoa).
3. Sve `EXPO_PUBLIC_*` promenljive se ugrađuju u klijentski bundle u build-time.

Environment se validira Zod semama pri startu:
- `apps/api/src/config/env.ts` - `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`,
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- `apps/mobile/src/config/env.ts` - `EXPO_PUBLIC_API_URL` (sa default vrednošću
  za lokalni razvoj ako promenljiva nije postavljena), `EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Supabase Auth - anon/publishable ključ je
  javan po dizajnu, RLS je stvarna kontrola pristupa).

Nevalidan environment baca čitljivu grešku (`EnvValidationError` iz
`@risesolo/validation`) i aplikacija se namerno ne podiže (fail-fast).

`SUPABASE_SERVICE_ROLE_KEY` je **tajna** vrednost - backend je koristi da
pozove SECURITY DEFINER RPC funkcije (videti "API i bezbednosni model"
ispod), nikad se ne prosleđuje klijentu i ne komituje se stvarna vrednost.

## API i bezbednosni model

Backend (`apps/api`) razgovara sa Supabase Postgres projektom preko
service-role klijenta (`apps/api/src/supabase/supabase.module.ts`).
Autentifikacija je Supabase Auth JWT verifikovan protiv JWKS endpoint-a
projekta (`apps/api/src/auth/`) - svaki zahtev mora nositi
`Authorization: Bearer <token>`, a `playerId` se uzima iz `sub` claim-a
tokena, nikad iz request body-ja/query stringa.

**Nijedna XP/Level/Coins/Stat Points vrednost ne dolazi sa klijenta.**
Sve mutacije koje utiču na progres (uključujući Nutrition XP od Faze 3) idu
kroz `SECURITY DEFINER` RPC funkcije u `supabase/migrations/` (`fn_grant_xp`,
`fn_grant_reward`, `fn_complete_daily_quest`, `fn_log_workout`,
`fn_allocate_stat_points`, `fn_log_meal`, `fn_log_water`,
`fn_upsert_nutrition_targets`, `fn_evaluate_achievements`,
`fn_expire_stale_quests`) koje:
- atomski izračunavaju level-up (formula `XP = Level² × 100`, ista formula
  je duplirana i testirana u `packages/domain/src/gamification`),
- su idempotentne (unique constraint na `xp_transactions`/`reward_transactions`
  po `(player_id, source, source_ref_id)` - retry isti zahtev nikad ne
  duplira nagradu),
- su dostupne isključivo `service_role` ulozi (RLS + eksplicitan `REVOKE`
  za `anon`/`authenticated` - potvrđeno Supabase security advisor-om).

Ruta (sve zahtevaju autentifikaciju):

| Metoda | Ruta | Opis |
| --- | --- | --- |
| GET | `/players/me` | Player profil (level/xp/statovi/rank/streak) |
| PATCH | `/players/me` | Ažurira `displayName`/`class` |
| POST | `/players/me/stat-points/allocate` | Troši Stat Points na izabrani atribut |
| GET | `/quests` | Lista questova (opciono `?status=`) |
| POST | `/quests/daily/generate` | Vraća/kreira današnji Daily Quest (idempotentno) |
| POST | `/quests/weekly/generate` | Vraća/kreira ovonedeljni Weekly Quest (idempotentno po ISO nedelji) |
| POST | `/quests/side/generate` | Vraća/kreira današnji Side Quest - Nutrition fokusiran (idempotentno) |
| POST | `/quests/:id/complete` | Završava quest čiji je progres dostigao cilj |
| GET | `/exercises` | Katalog vežbi (difficulty, uputstva, alternative vežbe) |
| GET | `/exercises/:id/progress` | Progressive Overload signal (Epley 1RM trend poslednje 2 sesije) |
| POST | `/workouts` | Beleži trening (serije) - PR detekcija + XP + quest progres + streak |
| GET | `/workouts` | Istorija treninga |
| GET | `/workouts/:id` | Detalji treninga (sa serijama) |
| GET | `/nutrition/targets` | Kalorijski/makro/vodeni ciljevi igrača |
| PATCH | `/nutrition/targets` | Delimično ažuriranje ciljeva (izostavljeno polje ostaje nepromenjeno) |
| POST | `/nutrition/meals` | Beleži obrok (+ Nutrition XP) |
| POST | `/nutrition/water` | Beleži unos vode (+ Nutrition XP) |
| GET | `/nutrition/summary` | Dnevni zbir obroka/vode nasuprot ciljevima (opciono `?date=YYYY-MM-DD`) |
| GET | `/achievements` | Ceo achievement katalog + `unlocked`/`unlockedAt` stanje za igrača |
| POST | `/achievements/evaluate` | Proverava trenutne pragove i otključava nove (vraća samo novootključane) |

## Mobile Auth (Faza 3)

`apps/mobile` koristi Supabase Auth (email/lozinka) preko
`apps/mobile/src/auth/AuthProvider.tsx` - React Context koji drži sesiju,
osvežava je automatski, i izlaže `getAccessToken()` koji
`apps/mobile/src/api/use-api-client.ts` prosleđuje `@risesolo/api-client`
za `Authorization` header na svakom pozivu. Sesija se čuva preko
`@react-native-async-storage/async-storage` (ne `expo-secure-store` - taj
ima ~2KB limit po stavci što može da preseče JWT/refresh token par,
zvanična Supabase Expo preporuka je AsyncStorage). Neulogovan korisnik se
preusmerava na `/sign-in` (`app/sign-in.tsx`); ulogovan vidi System Status
ekran (`app/index.tsx`, Player status + Daily Quest karte).

## Arhitektonska pravila (Faza 1 i nadalje)

1. Modularni monolit sa domain granicama - videti [`packages/domain/README.md`](packages/domain/README.md).
2. TypeScript `strict` je uključen svuda (`tsconfig.base.json` + per-app strogi flegovi).
3. UI komponente ne pozivaju bazu niti sadrže poslovna pravila.
4. Deljene Zod seme i tipovi žive u `packages/validation` i `packages/domain`.
5. DTO tipovi su usklađeni sa API ugovorom kroz **jedan izvor istine**: Zod
   sema u `packages/validation/src/contracts` koju koriste i `apps/api`
   (odgovor kontrolera) i `packages/api-client` (runtime validacija na
   klijentu). Puna OpenAPI JSON generacija je odložena za fazu kada bude
   više endpoint-a - videti "Poznata ograničenja" ispod.
6. Mobile hook-ovi vraćaju diskriminovani union
   `{status: "loading" | "success" | "error" | ...}` (npr. `useDailyQuest`
   dodaje `"empty"`, `useLogWorkout`/`useLogMeal`/`useLogWater` dodaju
   `"idle"`/`"submitting"`); komponente granaju render po `status` polju
   umesto po odvojenim boolean zastavicama.
7. Dark tema je podrazumevana (`apps/mobile/app/_layout.tsx` postavlja
   `dark` na startu); Light tema je podržana preko NativeWind `dark:` varijanta.
8. Animacije (kada se uvedu) moraju poštovati Reduce Motion.
9. Boje **Cyan, Purple, Gold, Emerald, Blue, Orange, Red** se koriste
   isključivo za semantičku namenu definisanu u
   [`packages/design-tokens/src/colors.ts`](packages/design-tokens/src/colors.ts)
   (accent/premium/reward/success/info/warning/danger). Sve ostalo koristi
   neutralnu (slate) skalu. Ovo je pokriveno testom
   (`packages/design-tokens/src/colors.test.ts`).
10. Svaka završena funkcija ima testove (Jest; `jest-expo` + React Native
    Testing Library za mobile).
11. Backend nikad ne veruje XP/Level/Coins/Stat Points vrednostima sa
    klijenta - te mutacije idu isključivo kroz SECURITY DEFINER RPC
    funkcije opisane u "API i bezbednosni model".

## Testiranje

- `packages/*` - Jest + ts-jest, jedinični testovi uz izvorni kod (`*.test.ts`).
- `apps/api` - Jest (jedinični `*.spec.ts` + e2e `*.e2e-spec.ts` preko Supertest).
- `apps/mobile` - `jest-expo` preset + `@testing-library/react-native`.

## CI

`.github/workflows/ci.yml` pokreće na svaki push/PR: install (`pnpm install --frozen-lockfile`),
lint, typecheck i test - identično lokalnim komandama iznad.

## Poznata ograničenja (Faza 5)

- Nema Prisma/Redis/BullMQ/Socket.IO konekcije - `DATABASE_URL`/`REDIS_URL`
  ostaju u env semi radi predvidljivog oblika; stvarna baza je Supabase
  Postgres pristupljen preko `@supabase/supabase-js` (service-role klijent),
  ne preko Prisma ORM-a.
- DB row tipovi (`apps/api/src/modules/*/*.types.ts`) su ručno održavano
  ogledalo tabela iz `supabase/migrations/` - pravo generisanje tipova
  (`supabase gen types typescript`) je odloženo dok broj tabela to ne
  opravda.
- Nema pune OpenAPI JSON generacije (Swagger) - DTO usklađenost se obezbeđuje
  deljenom Zod semom (`packages/validation/src/contracts/`); uvodi se kada
  broj endpoint-a to opravda.
- Questovi su i dalje sistemski (fiksni template-i, ne generativni) - Faza 5
  dodaje Weekly (`POST /quests/weekly/generate`, 5 treninga/ISO nedelja) i
  Side (`POST /quests/side/generate`, 3 obroka/dan) uz postojeći Daily, plus
  lenju ekspiraciju (`fn_expire_stale_quests`, pozvano pre svakog
  listQuests/generate poziva - nema cron job). Main/Boss/Hidden/Penalty tipovi
  i pravi System AI generator questova dolaze u kasnijim fazama (videti
  `packages/domain/README.md`).
- Training Plans (Daily/Weekly split, Recovery Days, Deload, automatska
  zamena vežbi) nisu implementirani - Faza 3 pokriva samo katalog vežbi +
  ad-hoc workout logging + Progressive Overload signal (poredi poslednje 2
  sesije; nema jos preporuka/prilagođavanja plana).
- Nutrition XP je fiksan po logu (meal/water), bez "dnevni cilj ispunjen"
  bonusa (izbegnuta idempotencija-po-danu komplikacija za sada) i bez Food
  Scanner-a (kalorije/makroi se unose ručno).
- System AI (analiza/coach/adaptivni trening/stagnation detection), formalna
  Rank Examination (trenutno je `rank` polje na Player-u statično - napreduje
  se samo kroz Level/XP, nema poseban "ispit"), Class Evolution, Dungeons/Bosses
  i community/guild sistemi nisu implementirani - namerno kasnije faze.
- Achievements/Titles (Faza 4) su implementirani kao fiksan seed-ovan katalog
  (`supabase/migrations/..._achievements_system.sql`, ~17 achievement-a) sa
  automatskim otključavanjem preko `fn_evaluate_achievements` - nema još
  UI-a za administraciju kataloga (dodavanje novih achievement-a ide kroz
  migraciju, ne kroz admin ekran) niti push notifikacija na otključavanje
  (samo in-app prikaz posle `logWorkout`, i na `/achievements` ekranu).
- Mobile pokriva: System Status (Player + Daily Quest), workout logging
  (`/workout/log`), Nutrition (`/nutrition`), Achievements (`/achievements`)
  i Progressive Overload grafikon (`/exercise/progress`). Nema još
  Training Plans ekrana (nema backend podrška ni za to, videti gore).
- Mobile "build" u CI/lokalno je `expo export --platform web` (potvrđuje da se
  JS bandluje ispravno) - native (iOS/Android) build zahteva Xcode/Android SDK
  i nije deo ovog pipeline-a. `@react-native-async-storage/async-storage`
  verzija je ručno pinovana (`npx expo install` kompatibilnost-provera nije
  bila dostupna u razvojnom okruženju) - proveriti pre native builda.
