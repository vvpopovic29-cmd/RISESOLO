# RISESOLO

Gamifikovana fitness aplikacija (System RPG estetika, bez kopiranja tuđih
zaštićenih vizuelnih elemenata). Ovaj repo je pnpm/Turborepo monorepo.

> **Faza 2 (trenutno stanje):** Game Engine core - email autentifikacija
> (JWT), player profil (XP/nivo/Hunter Rank/statistike) i osnovni Quest
> CRUD sa dodelom nagrada, sa pravom PostgreSQL/Prisma perzistencijom
> (podaci prezive restart procesa). Ostale poslovne funkcije (trening,
> ishrana, community, oporavak, System AI) i mobile UI za ovu funkcionalnost
> dolaze u narednim fazama.

## Struktura

```
apps/
  api/      NestJS - REST API
    auth/     registracija/login, JWT izdavanje
    player/   player profil, XP/nivo/rang (izvedeno), dodela poena statistike
    quests/   quest CRUD + zavrsetak questa (dodeljuje XP/gold kroz game engine)
    health/   health-check ruta
    prisma/   PrismaService/PrismaModule (globalni, konekcija ka PostgreSQL)
    (uz src/, ima i sopstveni prisma/schema.prisma + prisma/migrations/)
  mobile/   Expo (React Native + TypeScript + Expo Router + NativeWind)
packages/
  domain/        domain kernel (Brand/Result/assertNever) + gamification modul (XP kriva, rang, quest invarijante)
  validation/    deljene Zod seme, env-loader, DTO ugovori (auth/player/quest/health)
  design-tokens/ boje (dark/light), spacing, tipografija + NativeWind preset
  api-client/    tipizovan fetch klijent sa runtime validacijom odgovora
```

## Preduslovi

- Node.js `>=20` (videti `.nvmrc`)
- pnpm `12.3.4` (repo koristi `packageManager` polje - `corepack enable && corepack prepare pnpm@12.3.4 --activate`)
- PostgreSQL `>=14` dostupan lokalno (ili u kontejneru) - vidi "Baza podataka
  (PostgreSQL/Prisma)" ispod za tacne komande.

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

1. Kopirati `.env.example` u `.env` u korenu repoa (`apps/api` ga cita preko
   `envFilePath: [".env", "../../.env"]` kada se pokrece sa `nest start`).
2. Kopirati `.env.example` i u `apps/api/.env` - Prisma CLI (`prisma migrate`,
   `prisma generate`, itd.) cita environment samo iz `.env` fajla pored
   sopstvenog `package.json` (`apps/api/.env`), ne iz root `.env`-a niti iz
   NestJS-ovog `ConfigModule`. Alternativa je prefiksovati svaku Prisma
   komandu sa `DATABASE_URL=... ` (vidi "Baza podataka" ispod).
3. Kopirati `apps/mobile/.env.example` u `apps/mobile/.env` (Expo CLI čita
   `.env` samo iz korena te aplikacije, ne iz korena monorepoa).
4. Sve `EXPO_PUBLIC_*` promenljive se ugrađuju u klijentski bundle u build-time.

Environment se validira Zod semama pri startu:
- `apps/api/src/config/env.ts` - `NODE_ENV`, `PORT`, `DATABASE_URL`,
  `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`.
- `apps/mobile/src/config/env.ts` - `EXPO_PUBLIC_API_URL` (sa default vrednošću
  za lokalni razvoj ako promenljiva nije postavljena).

Nevalidan environment baca čitljivu grešku (`EnvValidationError` iz
`@risesolo/validation`) i aplikacija se namerno ne podiže (fail-fast).

## Baza podataka (PostgreSQL/Prisma)

`apps/api` koristi Prisma (`apps/api/prisma/schema.prisma`) protiv prave
PostgreSQL baze - `auth`, `player` i `quests` repozitorijumi (Faza 2) čitaju
i pišu kroz `PrismaService` (`apps/api/src/prisma/`), ne in-memory.

Lokalno podešavanje (jednom):

```bash
# Kreiraj lokalnog korisnika i dev/test baze koje ocekuje DATABASE_URL
# (podesi po potrebi ako vec imas drugaciju PostgreSQL instancu/kredencijale).
psql -U postgres -c "CREATE ROLE risesolo LOGIN PASSWORD 'risesolo' CREATEDB;"
psql -U postgres -c "CREATE DATABASE risesolo OWNER risesolo;"
psql -U postgres -c "CREATE DATABASE risesolo_test OWNER risesolo;"

# Primeni postojece migracije (ne pravi nove) na obe baze
pnpm --filter @risesolo/api exec prisma migrate deploy
DATABASE_URL=postgresql://risesolo:risesolo@localhost:5432/risesolo_test \
  pnpm --filter @risesolo/api exec prisma migrate deploy
```

`CREATEDB` privilegija je potrebna samo developeru koji kasnije pravi nove
migracije (`prisma migrate dev` pravi privremenu "shadow" bazu); u CI/produkciji
dovoljan je `prisma migrate deploy` bez te privilegije.

Korisne komande (iz `apps/api`, ili `pnpm --filter @risesolo/api <script>` iz korena):

```bash
pnpm db:migrate         # prisma migrate dev - nova migracija iz izmena seme (lokalni razvoj)
pnpm db:migrate:deploy  # prisma migrate deploy - primeni postojece migracije (CI/produkcija)
pnpm db:generate        # prisma generate - regenerisi Prisma Client (pokrece se i automatski, postinstall)
pnpm db:studio          # prisma studio - GUI za pregled podataka
```

`risesolo_test` je odvojena baza koju koristi `apps/api/test/game-engine.e2e-spec.ts`
(brise svoje redove pre svakog testa) - da e2e testovi ne bi menjali dev podatke.

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

## Testiranje

- `packages/*` - Jest + ts-jest, jedinični testovi uz izvorni kod (`*.test.ts`).
- `apps/api` - Jest (jedinični `*.spec.ts` + e2e `*.e2e-spec.ts` preko Supertest).
  Jedinični testovi servisa koriste in-memory implementacije repozitorijuma
  (`InMemoryUsersRepository` i sl. - brzi test dvojnici iza istog port
  interfejsa, ne runtime put) i ne zahtevaju bazu. `game-engine.e2e-spec.ts`
  se povezuje na pravu PostgreSQL (`risesolo_test`) - vidi "Baza podataka"
  iznad pre pokretanja `pnpm --filter @risesolo/api test`.
- `apps/mobile` - `jest-expo` preset + `@testing-library/react-native`.

## CI

`.github/workflows/ci.yml` pokreće na svaki push/PR: install
(`pnpm install --frozen-lockfile`), lint, typecheck, primenu Prisma migracija
na `postgres:16` servisni kontejner (`prisma migrate deploy` protiv
`risesolo_test`), i test - identično lokalnim komandama iznad.

## Poznata ograničenja (Faza 2)

- Perzistencija (PostgreSQL/Prisma) postoji za `auth`/`player`/`quests`, ali
  bez connection pooling-a (npr. PgBouncer) ili migracija koje se pokrecu kao
  deo deploy pipeline-a izvan CI - relevantno tek kada se dodaje produkcioni
  deploy.
- Nema pune OpenAPI JSON generacije (Swagger) - DTO usklađenost se obezbeđuje
  deljenom Zod semom; uvodi se kada broj endpoint-a to opravda.
- Ekonomija (gold sistem van quest nagrada), community, training, nutrition,
  recovery i System AI moduli dolaze u narednim fazama. Redis/BullMQ
  konekcija jos nije uspostavljena - `REDIS_URL` i dalje postoji samo u env
  semi radi predvidljivog oblika.
- Mobile "build" u CI/lokalno je `expo export --platform web` (potvrđuje da se
  JS bandluje ispravno) - native (iOS/Android) build zahteva Xcode/Android SDK
  i nije deo ovog pipeline-a. Mobile UI za Faza 2 funkcionalnost (auth ekrani,
  player profil, quest lista) nije jos implementiran - API je testiran preko
  e2e testova i moze se koristiti odmah preko `@risesolo/api-client` prosirenja
  u sledecoj fazi.
