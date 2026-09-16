# RISESOLO

Gamifikovana fitness aplikacija (System RPG estetika, bez kopiranja tuđih
zaštićenih vizuelnih elemenata). Ovaj repo je pnpm/Turborepo monorepo.

> **Trenutno stanje:** core gameplay loop radi end-to-end, backend i mobile
> UI - `Auth -> Onboarding -> Home -> Exercises -> Workout -> Complete ->
> XP/Level-up/Rewards -> Stat Points`. Server (NestJS + Prisma/PostgreSQL)
> je jedini autoritet za XP/Level/Rank/Coins/Streak; mobile (Expo) ekrani
> citaju/pisu iskljucivo preko `@risesolo/api-client`. AI trening planovi,
> Boss Quest, Penalty System, Nutrition tracking i Guild sistem (upravljanje
> cehom, cehovski nivo/raid, poruke, riznica) su implementirani. EAS build je
> konfigurisan (`apps/mobile/eas.json` + `expo-dev-client`) ali zahteva
> korisnikov Expo/Apple/Google nalog da bi se stvarni build pokrenuo - vidi
> "EAS Build" ispod. Subscriptions/RevenueCat infrastruktura (webhook,
> entitlement gate na AI trening planovima, paywall, restore purchases) je
> implementirana - vidi "Subscriptions/RevenueCat" ispod za sta jos zahteva
> korisnikovu App Store Connect/Google Play Console/RevenueCat Dashboard
> konfiguraciju. Push notifikacije (Boss Quest/Guild Raid/kick iz ceha) su
> implementirane preko Expo push servisa - vidi "Push Notifications" ispod.
> Napredna nutrition analitika je namerno van obima.

## Struktura

```
apps/
  api/      NestJS - REST API (auth, players, exercises, quests, workouts,
            Prisma/PostgreSQL - vidi apps/api/prisma/schema.prisma)
  mobile/   Expo (React Native + TypeScript + Expo Router + NativeWind)
packages/
  domain/        domain kernel (Brand/Result/assertNever) + gamification modul
                  (XP/Level/Rank/Stats/Quest/Streak pravila - vidi packages/domain/README.md)
  validation/    deljene Zod seme (auth/players/exercises/quests/workouts DTO), env-loader
  design-tokens/ boje (dark/light), spacing, tipografija + NativeWind preset
  api-client/    tipizovan fetch klijent sa runtime validacijom odgovora
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
  `JWT_SECRET`, `JWT_EXPIRES_IN`, opciono `ANTHROPIC_API_KEY` i
  `REVENUECAT_WEBHOOK_AUTH_HEADER`.
- `apps/mobile/src/config/env.ts` - `EXPO_PUBLIC_API_URL` (sa default vrednošću
  za lokalni razvoj ako promenljiva nije postavljena), opciono
  `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`/`EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`.

Nevalidan environment baca čitljivu grešku (`EnvValidationError` iz
`@risesolo/validation`) i aplikacija se namerno ne podiže (fail-fast).

## Baza podataka (Prisma / PostgreSQL)

```bash
pnpm --filter @risesolo/api prisma:migrate   # kreira/primenjuje migracije (dev)
pnpm --filter @risesolo/api prisma:deploy    # primenjuje postojeće migracije (CI/prod)
pnpm --filter @risesolo/api prisma:seed      # ucitava exercise library (247 vežbi) u bazu
```

Šema: `apps/api/prisma/schema.prisma`. `total_xp` je jedini izvor istine za
progres - `level`/`rank` se uvek izvode preko `@risesolo/domain` (vidi
`packages/domain/README.md`), nikad se ne perzistiraju direktno.

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

## EAS Build (native iOS/Android build)

`apps/mobile/eas.json` definiše tri build profila (managed workflow - nema
komitovanih `ios/`/`android/` foldera, EAS ih generiše u cloud-u iz `app.json`):

- `development` - development client (`expo-dev-client`), interna distribucija;
  koristi se za testiranje native modula (npr. budući RevenueCat SDK) koji ne
  rade u Expo Go niti u web exportu.
- `preview` - interna distribucija za QA/TestFlight internal testing.
- `production` - App Store/Play Store submission, auto-increment build broja
  (`appVersionSource: "remote"` - EAS upravlja `buildNumber`/`versionCode`).

Preduslovi (rade se JEDNOM, van ove sesije - zahtevaju tvoj Expo/Apple/Google
nalog; ova sesija nema pristup tim nalozima pa ne može sama da pokrene pravi build):

1. `npm install -g eas-cli` (ili koristi `npx eas-cli@latest` preko skripti ispod).
2. `pnpm --filter @risesolo/mobile run eas:login` - prijava na Expo nalog.
3. `pnpm --filter @risesolo/mobile run eas:init` - povezuje projekat sa EAS-om
   i upisuje `extra.eas.projectId` u `app.json` (namerno nije hardkodovano ovde).
4. iOS build zahteva plaćen Apple Developer Program nalog; Android build
   zahteva Google Play Console developer nalog.
5. Zameniti `CHANGE_ME-*` placeholder URL-ove u `eas.json` (`EXPO_PUBLIC_API_URL`
   po profilu) stvarnim deployed API adresama pre `preview`/`production` build-a.

Komande (iz `apps/mobile`):

```bash
pnpm run build:dev          # development client (za testiranje native modula)
pnpm run build:preview      # interni QA build
pnpm run build:production   # store-ready build
pnpm run submit:ios         # eas submit - App Store Connect
pnpm run submit:android     # eas submit - Google Play Console
```

`ios.bundleIdentifier`/`android.package` su postavljeni na `com.risesolo.app`
(placeholder - promeniti ako je stvarni bundle ID drugačiji pre prvog builda,
jer se posle prve submisije na Store ne može menjati).

Ova faza namerno NE pokreće stvarni cloud build - verifikovano je da je
konfiguracija validna (`npx expo config`, `expo-doctor`) i da postojeći
`expo export --platform web` build i dalje radi nakon dodavanja
`expo-dev-client` zavisnosti.

`.github/workflows/eas-build.yml` je opcioni manuelni (`workflow_dispatch`)
GitHub Actions workflow koji pokreće `eas build` za izabrani profil/platformu.
Ne pokreće se automatski na push/PR i ostaje neaktivan (`if: secrets.EXPO_TOKEN != ''`)
dok vlasnik repoa sam ne doda `EXPO_TOKEN` secret (Settings -> Secrets and
variables -> Actions) generisan preko `expo.dev/accounts/[nalog]/settings/access-tokens`.

## Subscriptions/RevenueCat

Server-authoritative pretplate preko RevenueCat-a - `pro_access` entitlement
trenutno otkljucava neograniceno generisanje AI trening planova (besplatni
korisnici imaju `FREE_TRAINING_PLAN_LIMIT` - vidi `packages/domain/src/subscription/entitlement.ts`).

**Implementirano (kod, ova sesija):**
- `apps/api/src/subscriptions` - `POST /subscriptions/webhook` (RevenueCat
  server-to-server, autentifikovan preko custom `Authorization` header
  vrednosti - vidi `REVENUECAT_WEBHOOK_AUTH_HEADER`) i `GET /subscriptions/me`
  (JWT-gated status za trenutnog korisnika). Webhook je JEDINI nacin da
  `Subscription` red u bazi postane aktivan - lokalni RevenueCat SDK na
  klijentu se NIKAD direktno ne pita za entitlement u server-side gate-ovima.
- `apps/api/src/training-plans/training-plans.service.ts` - `generate()`
  proverava `canGenerateTrainingPlan` PRE poziva AI-a i vraca `402 Payment
  Required` kada je besplatni limit dostignut.
- `apps/mobile/src/subscriptions/purchases.ts` - tanak wrapper oko
  `react-native-purchases` SDK-a (configure/purchasePackage/restorePurchases/
  customer info listener), guard-ovan da NIKAD ne pravi stvarne pozive na
  webu (`Platform.OS === "web"`) niti bez konfigurisanog API kljuca.
- `apps/mobile/app/paywall.tsx` - paywall ekran (cene iz RevenueCat offerings
  kada su dostupne, orijentaciona cena kao fallback), Restore Purchases
  dugme, linkovi ka `app/legal/{terms,privacy}.tsx` i obavezna napomena o
  automatskom obnavljanju/otkazivanju (Apple/Google zahtev). Dostupan sa
  Home ekrana i automatski kada `POST /training-plans/generate` vrati 402.

**Zahteva tvoju akciju (van ove sesije - nalozi kojima ova sesija nema pristup):**
1. **App Store Connect** - kreirati `monthly_pro`/`annual_pro` proizvode,
   Subscription Group (da korisnik ne moze imati dve aktivne pretplate
   istovremeno), opciono uvodnu ponudu/free trial.
2. **Google Play Console** - isto za Android (Play Console subscription
   proizvodi + base plans).
3. **RevenueCat Dashboard** - napraviti Project, povezati iOS/Android app
   (API kljucevi za `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`/
   `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`), kreirati `pro_access`
   entitlement (MORA se zvati tacno tako - vidi `PRO_ENTITLEMENT_ID` u
   `packages/domain/src/subscription/entitlement.ts` i
   `apps/mobile/src/subscriptions/purchases.ts`), kreirati "Default Offering"
   sa mesecnim/godisnjim paketom, i podesiti webhook (Project Settings ->
   Integrations -> Webhooks) na `https://<tvoj-api-domen>/subscriptions/webhook`
   sa "Authorization" header vrednoscu koju upisujes i u `REVENUECAT_WEBHOOK_AUTH_HEADER`.
4. Stvarno testiranje kupovine zahteva EAS development/internal build (vidi
   "EAS Build" iznad) - `react-native-purchases` je nativni modul, ne radi u
   Expo Go niti u web exportu.
5. Cene navedene u `app/paywall.tsx` (`ESTIMATED_PACKAGES`) su orijentacione
   ($6.99/mesecno, $49.99/godisnje) - stvarna cena se podesava u App Store
   Connect/Play Console i automatski se prikazuje preko RevenueCat offerings
   kada su Store proizvodi kreirani.

## Push Notifications

Preko [Expo push servisa](https://exp.host) (besplatan, ne zahteva sopstveni
notifikacioni backend/queue) - server salje notifikaciju na tri postojeca
dogadjaja:

- **Boss Quest pobedjen** - korisniku koji je zavrsio nedeljni izazov
  (`apps/api/src/workouts/workouts.service.ts`).
- **Cehovski raid zavrsen** - SVIM clanovima ceha, ne samo onome cijim je
  treningom raid zavrsen (`GuildsService.sendRaidCompletionNotification`).
- **Izbacen si iz ceha** - korisniku kog je LEADER/OFFICER izbacio
  (`GuildsService.kickMember`).

Namerno NEMA scheduled/cron podsetnika (npr. "nisi trenirao danas") - isto
ogranicenje kao Redis/BullMQ (vidi "Poznata ograničenja" ispod), jer bi to
zahtevalo pravi scheduler koji jos nije ozicen. Svi trigeri su event-driven
(salju se odmah kad se dogadjaj desi na serveru), nikad na tajmer.

Arhitektura (server-authoritative, isti princip kao ostatak app-a):
- `apps/api/src/notifications` - `PushToken` model (jedan red po fizickom
  uredjaju, `token` je globalno unique), `NotificationsService.sendToUser`/
  `sendToUsers` (best-effort - mrezni poziv ka Expo servisu NIKAD ne baca
  gresku na gore niti se poziva unutar DB transakcije, vidi komentare u
  `notifications.service.ts`).
- `apps/mobile/src/notifications/push-notifications.ts` - trazi dozvolu i
  registruje token preko `expo-notifications`, guard-ovano da nikad ne radi
  na webu niti bez EAS `projectId` (vidi ispod). Tap na notifikaciju
  navigira preko `data.screen` polja (postavljeno na serveru).

**Zahteva tvoju akciju (van ove sesije):**
1. `getExpoPushTokenAsync` zahteva EAS `projectId` upisan u `app.json` ->
   `extra.eas.projectId`, sto se desava tek nakon `eas init` (vidi "EAS
   Build" iznad) - do tada je registracija tokena namerno no-op.
2. Za standalone (EAS) Android build, potrebno je povezati Firebase Cloud
   Messaging projekat preko `eas credentials` (Expo/EAS automatski upravlja
   iOS APNs kredencijalima).
3. Stvarno slanje/prijem notifikacije se ne moze testirati u Expo Go niti u
   web exportu za standalone kredencijale - potreban je EAS development ili
   production build na fizickom uredjaju.

## Achievements/Badges

Trajni milestone-ovi (jednom otkljucan, zauvek ostaje otkljucan) - katalog
zivi iskljucivo u `packages/domain/src/achievements` (`ACHIEVEMENT_DEFINITIONS`,
18 achievement-a preko kategorija WORKOUTS/STREAK/LEVEL/QUESTS/NUTRITION/
TRAINING_PLAN/GUILD).

Isti "derive, don't cache" princip kao total_xp/level: server nikad ne pamti
proizvoljan "level 10 badge" boolean koji moze da zaostane - umesto toga,
`AchievementsService.evaluateAndUnlock` racuna svez `AchievementStatsSnapshot`
iz postojecih tabela (broji `XpEvent` po izvoru, `NutritionEntry`,
`TrainingPlan`, proverava `GuildMembership` - nema posebnih "counter" kolona)
i perzistira samo novo otkljucane u `UserAchievement`
(`@@unique([userId, achievementId])`, race-safe preko `skipDuplicates`).

- **Trigeri** (svi POSLE glavne transakcije/upisa, fire-and-forget, isti
  princip kao push notifikacije): zavrsen trening (`WorkoutsService`), unos u
  dnevnik ishrane (`NutritionService`), generisan AI trening plan
  (`TrainingPlansService`), osnivanje/pridruzivanje cehu (`GuildsService`).
- **Lazy catch-up**: `GET /achievements` prvo poziva istu evaluaciju pre nego
  sto vrati katalog - sustize propustene unlock-ove (npr. ako je achievement
  dodat posle vec postojece statistike) bez cekanja na sledeci trening. Isti
  princip kao "lazy" penalty provera u `PlayersService.getPlayerState`.
- Push notifikacija se salje samo za unlock-ove otkrivene kroz stvarni
  trigger (ne kroz lazy GET catch-up) - `AchievementsService.notifyNewlyUnlocked`.
- `apps/mobile/app/achievements.tsx` - grid otkljucanih/zakljucanih badge-ova
  (zakljucani vizuelno prigušeni), naziv/opis/ikonica su prikazni tekst u
  `apps/mobile/src/achievements/achievement-display.ts` (namerno odvojeno od
  domain sloja, isti princip kao `MEAL_TYPE_LABEL`).

## Leaderboards

Globalni rang igraca (po `total_xp`) i cehova (po `Guild.total_xp`) -
`GET /leaderboard/players` i `GET /leaderboard/guilds` (opcioni `?limit=`,
podrazumevano 20, max 100).

- **Live upit, bez keširanja** (isti razlog kao odsustvo Redis-a - vidi
  "Poznata ograničenja" ispod): `ORDER BY total_xp DESC LIMIT N` nad
  `Progression`/`Guild`, dovoljno brzo na MVP skali. Nema periodicnog
  snapshot-a niti materijalizovanog pogleda.
- **`position`** van top liste racuna preko `count(total_xp > moj) + 1`
  ("dense-ish" rangiranje - izjednacen `total_xp` deli istu poziciju).
- **`me`/`myGuild`** su UVEK prisutni u odgovoru (cak i van top `limit`
  liste) - jedan poziv umesto dva round-trip-a sa mobilnog klijenta.
- `apps/mobile/app/leaderboard.tsx` - tabovi "Igraci"/"Cehovi", sopstveni red
  istaknut (accent boja); ako korisnik nije u top listi, njegov red se
  prikazuje posebno na dnu ("TVOJA POZICIJA"/"TVOJ CEH").

## Testiranje

- `packages/*` - Jest + ts-jest, jedinični testovi uz izvorni kod (`*.test.ts`).
- `apps/api` - Jest (jedinični `*.spec.ts` + e2e `*.e2e-spec.ts` preko Supertest).
- `apps/mobile` - `jest-expo` preset + `@testing-library/react-native`.

## CI

`.github/workflows/ci.yml` pokreće na svaki push/PR: install (`pnpm install --frozen-lockfile`),
lint, typecheck i test - identično lokalnim komandama iznad.

## Poznata ograničenja (trenutno stanje)

- Redis/BullMQ/Socket.IO nisu ožičeni - `REDIS_URL` postoji samo u env semi
  radi predvidljivog oblika za buduće faze (cache/queue/real-time).
- Nema pune OpenAPI JSON generacije (Swagger) - DTO usklađenost se obezbeđuje
  deljenom Zod semom; uvodi se kada broj endpoint-a to opravda.
- `packages/domain` ima kernel + `gamification` modul implementiran; ostali
  bounded-context moduli (training, nutrition, community, economy, recovery)
  se dodaju u fazi kada se implementira odgovarajuća funkcija.
- Mobile ekrani (`apps/mobile/app/{login,register,onboarding,home,exercises,workout}.tsx`)
  su povezani na sve backend endpoint-e preko `@risesolo/api-client` i
  provereni u pravom browseru (Playwright, `expo export --platform web`) -
  kompletan tok registracija -> onboarding -> trening -> XP/level-up ->
  raspodela stat poena -> odjava radi sa pravim podacima sa servera.
  Nedostaje: pause/resume trening sesije, workout template-i ("Moji
  treninzi"), i UX polish (animacije, System vizuelni efekti).
- JWT se na nativnim platformama (iOS/Android) cuva u `expo-secure-store`
  (keychain/keystore); na webu (samo za `expo export --platform web`
  build-check, ne primarna meta) pada na `localStorage` jer
  `expo-secure-store` nema pravu web implementaciju - vidi
  `apps/mobile/src/auth/secure-storage.ts`.
- Mobile "build" u CI/lokalno je `expo export --platform web` (potvrđuje da se
  JS bandluje ispravno). Native (iOS/Android) build je konfigurisan preko EAS-a
  (vidi "EAS Build" iznad) ali zahteva korisnikov Expo/Apple/Google nalog da bi
  se stvarni cloud build pokrenuo - nije deo ovog CI pipeline-a i jos nije
  testirano na fizičkom uređaju/simulatoru.
- `apps/api/prisma/seed-data/exercise-library.json` (247 vežbi) je
  template-generisan (vidi seed-data/README.md) - instructions/form_cues
  tekst treba fitness-content review pre produkcije.
- Subscriptions/RevenueCat: kod je implementiran i testiran (webhook, gate,
  paywall, restore purchases), ali App Store Connect/Google Play
  Console/RevenueCat Dashboard konfiguracija (proizvodi, entitlement,
  offering, webhook URL) nije zavrsena - vidi "Subscriptions/RevenueCat"
  iznad. Bez toga `getCurrentOffering()` vraca `null` i paywall prikazuje
  orijentacionu cenu umesto stvarnih Store paketa.
- `app/legal/{terms,privacy}.tsx` sadrze placeholder pravni tekst - potrebna
  je pravna revizija (uklj. GDPR/CCPA usaglasenost po ciljnim trzistima) pre
  produkcije.
- Push notifikacije: backend (registracija tokena, slanje preko Expo push
  servisa, trigeri) je implementiran i testiran, ali stvarna registracija
  tokena zahteva EAS `projectId` (`eas init`, vidi "Push Notifications"
  iznad) i standalone build za Android FCM kredencijale - do tada je
  registracija no-op. Nema scheduled/cron podsetnika (isto ogranicenje kao
  Redis/BullMQ ispod) - samo event-driven trigeri.
