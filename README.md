# RISESOLO

Gamifikovana fitness aplikacija (System RPG estetika, bez kopiranja tuđih
zaštićenih vizuelnih elemenata). Ovaj repo je pnpm/Turborepo monorepo.

> **Faza 1:** monorepo i razvojno okruženje - workspace, deljeni tooling,
> environment validacija i health-check rute.
>
> **Faza 2 (trenutno stanje):** Gamification core - Player → Stats → XP →
> Level → Daily Quest → Workout → Rewards, na Supabase Postgres (projekat
> "RISESOLO"). Ostale poslovne funkcije (puna ishrana, System AI, Rank/Class
> evolucija, Dungeons/Bosses, community/guild) dolaze u narednim fazama -
> videti "Poznata ograničenja" ispod.

## Struktura

```
apps/
  api/      NestJS - REST API (Faza 2: Player/Quest/Workout/Rewards)
  mobile/   Expo (React Native + TypeScript + Expo Router + NativeWind)
packages/
  domain/        domain kernel (Brand/Result/assertNever) + gamification (XP/Level formule)
  validation/    deljene Zod seme, env-loader, health-check + gamification DTO
  design-tokens/ boje (dark/light), spacing, tipografija + NativeWind preset
  api-client/    tipizovan fetch klijent sa runtime validacijom odgovora
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
  za lokalni razvoj ako promenljiva nije postavljena).

Nevalidan environment baca čitljivu grešku (`EnvValidationError` iz
`@risesolo/validation`) i aplikacija se namerno ne podiže (fail-fast).

`SUPABASE_SERVICE_ROLE_KEY` je **tajna** vrednost - backend je koristi da
pozove SECURITY DEFINER RPC funkcije (videti "API i bezbednosni model"
ispod), nikad se ne prosleđuje klijentu i ne komituje se stvarna vrednost.

## API i bezbednosni model (Faza 2)

Backend (`apps/api`) razgovara sa Supabase Postgres projektom preko
service-role klijenta (`apps/api/src/supabase/supabase.module.ts`).
Autentifikacija je Supabase Auth JWT verifikovan protiv JWKS endpoint-a
projekta (`apps/api/src/auth/`) - svaki zahtev mora nositi
`Authorization: Bearer <token>`, a `playerId` se uzima iz `sub` claim-a
tokena, nikad iz request body-ja/query stringa.

**Nijedna XP/Level/Coins/Stat Points vrednost ne dolazi sa klijenta.**
Sve mutacije koje utiču na progres idu kroz `SECURITY DEFINER` RPC funkcije
u `supabase/migrations/` (`fn_grant_xp`, `fn_grant_reward`,
`fn_complete_daily_quest`, `fn_log_workout`, `fn_allocate_stat_points`) koje:
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
| POST | `/quests/:id/complete` | Završava quest čiji je progres dostigao cilj |
| GET | `/exercises` | Katalog vežbi |
| POST | `/workouts` | Beleži trening (serije) - PR detekcija + XP + quest progres + streak |
| GET | `/workouts` | Istorija treninga |
| GET | `/workouts/:id` | Detalji treninga (sa serijama) |

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
6. Health-check je upit (query), ne mutacija, pa demonstrira samo
   loading/success/error stanja (`apps/mobile/src/health`); puni
   loading/success/empty/error obrazac se primenjuje kada se uvedu prve
   poslovne mutacije.
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

## Poznata ograničenja (Faza 2)

- Nema Prisma/Redis/BullMQ/Socket.IO konekcije - `DATABASE_URL`/`REDIS_URL`
  ostaju u env semi radi predvidljivog oblika; stvarna baza je Supabase
  Postgres pristupljen preko `@supabase/supabase-js` (service-role klijent),
  ne preko Prisma ORM-a.
- DB row tipovi (`apps/api/src/modules/*/*.types.ts`) su ručno održavano
  ogledalo tabela iz `supabase/migrations/` - pravo generisanje tipova
  (`supabase gen types typescript`) je odloženo dok broj tabela to ne
  opravda.
- Nema pune OpenAPI JSON generacije (Swagger) - DTO usklađenost se obezbeđuje
  deljenom Zod semom (`packages/validation/src/contracts/gamification.ts`);
  uvodi se kada broj endpoint-a to opravda.
- Questovi su trenutno samo sistemski (fiksan Daily Quest template preko
  `POST /quests/daily/generate`) - Weekly/Main/Side/Boss/Hidden/Penalty tipovi
  i pravi System AI generator questova dolaze u kasnijim fazama (videti
  `packages/domain/README.md`).
- Nutrition, System AI (analiza/coach/adaptivni trening), Rank Examination,
  Class Evolution, Titles/Achievements, Dungeons/Bosses i community/guild
  sistemi nisu implementirani - ovo su namerno kasnije faze (Faza 3+ po
  prioritetu iz projektne specifikacije: Training/Exercise DB → Nutrition →
  System AI → Rank/Class/Titles/Dungeons).
- Mobile app još nema ekrane za Player/Quest/Workout (Faza 1 UI je i dalje
  samo health-check demo) - `packages/api-client` još ne pokriva nove rute.
- Mobile "build" u CI/lokalno je `expo export --platform web` (potvrđuje da se
  JS bandluje ispravno) - native (iOS/Android) build zahteva Xcode/Android SDK
  i nije deo ovog pipeline-a.
