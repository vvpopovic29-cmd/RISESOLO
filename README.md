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
> Dnevni quest ima varijetet - pool od WORKOUT_COMPLETE/LOG_NUTRITION kind-ova
> se bira deterministicki po (korisnik, datum), umesto jednog hardkodovanog
> questa (vidi `packages/domain/src/gamification/daily-quest-pool.ts`).
> Nedeljni quest (ODVOJEN od Boss Quest-a) daje drugi tier sedmicnog izazova -
> XP_TARGET (osvoji X XP te nedelje iz bilo kog izvora) ili NUTRITION_LOG_DAYS
> (uloguj obrok X razlicitih dana), progres izveden iz postojecih podataka i
> zavrsava se lazy na `GET /quests/weekly` (vidi
> `packages/domain/src/gamification/weekly-quest-pool.ts`).
> Main Quest je dugorocan LANAC (za razliku od Daily/Weekly/Boss nikad ne
> istice niti se resetuje po datumu) - rotira kroz stat-ove (snaga/agilnost/
> izdrzljivost/vitalnost/inteligencija), odvojen od Achievements koji vec
> pokrivaju "dostigni level X" (vidi
> `packages/domain/src/gamification/main-quest-pool.ts`).
> Side Quest je bonus izazov vezan za konkretnu sesiju treninga (MVP: "nova
> vezba" - zavrsi seriju vezbe koju nikad pre nisi radio). Za razliku od
> Weekly/Main Questa, `GET /quests/side` je read-only (nikad ne zavrsava
> quest) - zavrsetak se desava iskljucivo unutar workout completion engine-a
> (vidi `packages/domain/src/gamification/side-quest.ts`).
> Penalty Quest ("Iskupljenje") je "iskupljenje" za Penalty System - postoji
> SAMO kada je dnevni quest danas stvarno propusten i kaznjen (nikad se ne
> generise proizvoljno, za razliku od svih ostalih questova). Zavrsava se na
> 2. zavrsenom treningu istog dana i vraca TACAN iznos izgubljenih coins-a
> (vidi `packages/domain/src/gamification/penalty-quest.ts`).
> AI Quest je Pro-gated bonus quest ciji title/description generise Claude
> (personalizovano po nivou/rangu/stat-ovima/streak-u, vidi
> `apps/api/src/ai/ai.service.ts` `generateQuestFlavor`) - za razliku od svih
> ostalih questova, sadrzaj NIJE iz fiksnog kataloga. Zavrsava se identicno
> Daily Quest-ovom WORKOUT_COMPLETE kind-u (bilo koji zavrsen trening danas);
> besplatni korisnici i dani kada AI servis nije dostupan NIKAD ne dobijaju
> ovaj quest (`quest: null`, graceful degradation - vidi
> `packages/domain/src/gamification/ai-quest.ts`).
> Inventory (novi sistem, ODVOJEN od Achievements/Coin Shop) je pokrenut sa
> Hidden Items - tajni predmeti ciji uslov otkljucavanja NIKAD nije prikazan
> klijentu unapred (za razliku od Achievements pragova), server salje
> name/description tek posto je predmet otkriven (vidi
> `packages/domain/src/inventory/hidden-item.ts`).
> Workshop Items su drugi izvor - za razliku od Hidden Item-a, katalog je
> UNAPRED vidljiv (name/description/cena/potreban nivo su uvek poznati), ali
> igrac mora AKTIVNO da izradi predmet (`POST /inventory/workshop/craft`) uz
> dovoljan nivo I coins zajedno (za razliku od Coin Shop-a koji trazi samo
> coins, bez praga nivoa) - vidi `packages/domain/src/inventory/workshop-item.ts`.
> Guild Items su treci izvor - katalog je, kao i Workshop, UNAPRED vidljiv,
> ali se, kao Hidden Item, AUTOMATSKI dodeljuje (GET-only, bez akcije igraca)
> na osnovu cehovske aktivnosti (uloga LEADER, broj zavrsenih cehovskih
> rejdova, saldo riznice, duzina clanstva, nivo ceha) - vidi
> `packages/domain/src/inventory/guild-item.ts`.
> Event Items su cetvrti izvor - katalog je UNAPRED vidljiv kao Workshop i
> Guild, ali se, kao Workshop, prisvaja AKTIVNO (`POST /inventory/event/claim`)
> - BESPLATNO, bez nivoa/coins uslova, ali SAMO unutar godisnjeg kalendarskog
> prozora (mesec+dan, godina se ne racuna - isti prozor je ponovo dostupan
> svake godine), vidi `packages/domain/src/inventory/event-item.ts`.
> AI-Generated Items su peti izvor - tajan katalog kao Hidden Item (GET-only,
> automatsko otkrivanje po nivou), ali name/description NIJE iz staticnog
> kataloga - generise ih Claude po igracu (isti princip kao AI Quest,
> Pro-gated preko `SubscriptionsService.hasProAccess`), generisan tekst se
> MORA perzistirati (InventoryItem.generatedName/generatedDescription) jer
> se ne moze pozivati AI na svaki GET - besplatni korisnici i dani kada AI
> servis nije dostupan NIKAD ne otkljucavaju ove predmete (graceful
> degradation, katalog ostaje trajno "???"), vidi
> `packages/domain/src/inventory/ai-item.ts`.
> Recovery Items su sesti izvor - katalog je UNAPRED vidljiv kao Guild i
> AUTOMATSKI se dodeljuje (GET-only), ali na osnovu LICNOG obrasca odmora
> izmedju treninga (najveci razmak u danima izmedju dva zavrsena treninga,
> broj "odmorenih" razmaka od 2+ dana, ukupan broj razlicitih dana treninga)
> - ne guild aktivnosti (Guild) ni nivoa (AI-Generated), vidi
> `packages/domain/src/inventory/recovery-item.ts`.
> Custom Items su sedmi i poslednji izvor - za razliku od svih ostalih SEST
> izvora (svaki ima tacno 5 fiksnih ID-jeva u katalogu), Custom Item NEMA
> fiksan katalog - igrac SAM pise name/description preko
> `POST /inventory/custom/create`, server generise itemId
> (`crypto.randomUUID()`). Gate je cena u coins-ima (400, bez nivo uslova -
> kreativnost ne trazi majstorstvo) I ogranicen broj slotova (najvise 5) po
> igracu, ne katalog uslov - vidi `packages/domain/src/inventory/custom-item.ts`.
> Ovim je svih sedam Inventory (B2) izvora zavrseno.
> Nakon svih sedam izvora, dodato je bezbednosno/operativno ojacanje pred
> produkciju - rate limiting (`@nestjs/throttler`) i opciono Sentry
> monitoring (backend + mobile) - vidi "Rate Limiting & Monitoring" ispod.
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
  `JWT_SECRET`, `JWT_EXPIRES_IN`, opciono `ANTHROPIC_API_KEY`,
  `REVENUECAT_WEBHOOK_AUTH_HEADER` i `SENTRY_DSN`.
- `apps/mobile/src/config/env.ts` - `EXPO_PUBLIC_API_URL` (sa default vrednošću
  za lokalni razvoj ako promenljiva nije postavljena), opciono
  `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`/`EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
  i `EXPO_PUBLIC_SENTRY_DSN`.

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
notifikacioni backend/queue) - server salje notifikaciju na pet postojecih
dogadjaja:

- **Boss Quest pobedjen** - korisniku koji je zavrsio nedeljni izazov
  (`apps/api/src/workouts/workouts.service.ts`).
- **Cehovski raid zavrsen** - SVIM clanovima ceha, ne samo onome cijim je
  treningom raid zavrsen (`GuildsService.sendRaidCompletionNotification`).
- **Izbacen si iz ceha** - korisniku kog je LEADER/OFFICER izbacio
  (`GuildsService.kickMember`).
- **Novi zahtev za prijateljstvo** - primaocu, sa korisnickim imenom
  posiljaoca (`FriendsService.sendRequest`).
- **Zahtev za prijateljstvo prihvacen** - posiljaocu, sa korisnickim imenom
  onoga ko je prihvatio (`FriendsService.acceptRequest`).

Namerno NEMA scheduled/cron podsetnika (npr. "nisi trenirao danas") - to bi
zahtevalo pravi scheduler koji jos nije ozicen (vidi "Poznata ograničenja"
ispod). Svi trigeri su event-driven (salju se odmah kad se dogadjaj desi na
serveru), nikad na tajmer.

Arhitektura (server-authoritative, isti princip kao ostatak app-a):
- `apps/api/src/notifications` - `PushToken` model (jedan red po fizickom
  uredjaju, `token` je globalno unique), `NotificationsService.sendToUser`/
  `sendToUsers` stavljaju poruku u BullMQ red (`push-notifications`, Redis-backed
  - vidi "Rate Limiting & Monitoring" ispod) umesto direktnog mreznog poziva;
  `PushNotificationsProcessor` stvarno salje ka Expo servisu i automatski
  ponavlja pokusaj (retry/backoff) pri privremenom kvaru. Stavljanje u red je
  i dalje best-effort (nikad ne baca gresku na gore niti se poziva unutar DB
  transakcije, vidi komentare u `notifications.service.ts`).
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

- **Top-N `entries` se kratko kesiraju preko Redis-a** (~30s TTL,
  `CacheService` - vidi "Rate Limiting & Monitoring" ispod); `me`/`myGuild` su
  uvek live jer su jeftini PK lookup-i i ne mogu se deliti izmedju korisnika.
  Osnovni upit (`ORDER BY total_xp DESC LIMIT N` nad `Progression`/`Guild`) je
  i bez kesa dovoljno brz na MVP skali - kes je optimizacija, ne neophodnost.
  Nema periodicnog snapshot-a niti materijalizovanog pogleda.
- **`position`** van top liste racuna preko `count(total_xp > moj) + 1`
  ("dense-ish" rangiranje - izjednacen `total_xp` deli istu poziciju).
- **`me`/`myGuild`** su UVEK prisutni u odgovoru (cak i van top `limit`
  liste) - jedan poziv umesto dva round-trip-a sa mobilnog klijenta.
- `apps/mobile/app/leaderboard.tsx` - tabovi "Igraci"/"Cehovi", sopstveni red
  istaknut (accent boja); ako korisnik nije u top listi, njegov red se
  prikazuje posebno na dnu ("TVOJA POZICIJA"/"TVOJ CEH").

## Moji treninzi (Workout Templates)

Imenovana, ponovo-upotrebljiva kolekcija vezbi - `Workout` model je postojao
u schema.prisma jos od Faze 2 kao prazan template koncept (samo `name`),
nikad stvarno iskoriscen do sada.

- **`WorkoutTemplateExercise`** - join tabela (Workout <-> Exercise) sa
  eksplicitnim `order` (izveden iz pozicije u nizu pri kreiranju, klijent ga
  ne salje) i opcionim `targetSets` (samo predlog za UI, ne diktira
  izvrsenje - serije se i dalje loguju preko `WorkoutSet` u toku sesije).
- `POST/GET/DELETE /workouts/templates(/:id)` - CRUD sa ownership proverom
  (404 i za nepostojeci i za tudji template).
- `POST /workouts/sessions` je vec podrzavao opcioni `workoutId` (od Faze 2)
  - ova faza ga PRVI PUT stvarno koristi: `apps/mobile/app/workout.tsx`
    prima opcioni `workoutId` query param i prosledjuje ga pri pokretanju
    sesije, povezujuci je sa template-om.
- **Namerno ogranicen obim**: "Pokreni" iz template-a otvara POSTOJECI
  single-exercise `workout.tsx` ekran za PRVU vezbu (bez redizajna
  postojeceg workout flow-a). Vodjena sesija kroz SVE vezbe template-a
  redom je van obima ove faze - vidi "Poznata ograničenja" ispod.

## Coin Shop / Avatar Customization

Kozmetika kupljena za coins - prva licna potrosnja coins-a (dosad je jedini
"sink" bila guild riznica preko `GuildsService.donate`).

- **`packages/domain/src/shop`** - `SHOP_ITEMS` katalog (kategorije
  `AVATAR_FRAME`/`TITLE`, samo `id`/`category`/`price` - cist podatak bez
  I/O), `canPurchaseShopItem` (ne moze kupiti nesto sto vec ima niti nesto
  skuplje od trenutnih coins-a).
- **`UserCosmetic`** - trajno vlasnistvo nad kupljenim predmetom (isti
  princip kao `UserAchievement` - `itemId` je String, ne enum/FK, katalog
  zivi iskljucivo u `@risesolo/domain`). `Profile.equippedAvatarFrameId`/
  `equippedTitleId` cuvaju TRENUTNO opremljen predmet po kategoriji (`null`
  = nista opremljeno).
- `apps/api/src/shop/shop-catalog.ts` - prikazni tekst (naziv/opis/boja) po
  predmetu, namerno odvojeno od domain sloja (isti princip kao
  `ACHIEVEMENT_NOTIFICATION_CONTENT`).
- `GET /shop` (ceo katalog sa owned/equipped), `POST /shop/purchase`
  (atomska transakcija - provera coins-a i upis idu zajedno,
  `@@unique([userId, itemId])` je poslednja linija odbrane), `POST /shop/equip`,
  `DELETE /shop/equip/:category`.
- `PlayerProfileDto.title`/`avatarFrameColorHex` su izvedeni na serveru iz
  opremljenih predmeta (isti "derive, don't cache" princip kao level/rank) -
  `apps/mobile/app/home.tsx` prikazuje titulu i obojenu tacku pored username-a
  bez dodatnog round-trip-a.

## Rate Limiting & Monitoring

Bezbednosno/operativno ojacanje pred produkciju (odvojeno od poslovnih pravila):

- **Rate limiting** (`@nestjs/throttler`) - globalni default 60 zahteva/minut
  po IP (`app.module.ts`, `ResilientThrottlerGuard` kao `APP_GUARD`), sa
  strozim limitom od 5/minut na `POST /auth/register`/`POST /auth/login`
  (`apps/api/src/auth/auth.controller.ts` `AUTH_THROTTLE`) - meta
  brute-force/spam napada. U testovima (`NODE_ENV=test`, Jest ga automatski
  postavlja) je limit prakticno neogranicen da ne bi lazno rusio e2e paket -
  vidi `apps/api/src/common/throttle.ts`. Storage je Redis-backed
  (`@nest-lab/throttler-storage-redis`, deljen izmedju vise API instanci umesto
  in-memory po procesu); `ResilientThrottlerGuard`
  (`apps/api/src/common/resilient-throttler.guard.ts`) fail-open-uje kad
  storage baci gresku razlicitu od `ThrottlerException` - Redis nedostupnost
  propusta zahtev bez limita umesto da obori API (isti "placeholder-friendly"
  princip kao ostatak infrastrukture ispod).
- **Push notifikacije preko BullMQ reda** (`push-notifications` red, Redis-backed
  - vidi "Push Notifications" iznad) - `NotificationsService` stavlja poruku u
  red umesto direktnog Expo poziva; `PushNotificationsProcessor`
  (`apps/api/src/notifications/push-notifications.processor.ts`) je salje i
  automatski ponavlja (3 pokusaja, eksponencijalni backoff) pri privremenom
  mreznom/Expo kvaru - robusnije od stare fire-and-forget implementacije.
- **Read-kes za deljene liste** (`CacheService`, `apps/api/src/cache/`) -
  kratkotrajni (~30s TTL) Redis kes za `GET /guilds` i top-N delove
  leaderboard-a (vidi "Leaderboards" iznad) - iste, ne-per-user rezultate za
  sve korisnike. Best-effort: nedostupnost Redis-a vraca kes na live upit ka
  bazi umesto greske (isti princip kao rate limiting/push notifikacije iznad).
- **Sentry monitoring** (opciono, `@sentry/node`/`@sentry/react-native`) -
  isti "placeholder-friendly" princip kao AI/RevenueCat: bez `SENTRY_DSN`
  (`apps/api`)/`EXPO_PUBLIC_SENTRY_DSN` (`apps/mobile`) SDK se nikad ne
  inicijalizuje. Na backend-u, `SentryExceptionFilter`
  (`apps/api/src/common/filters`) prijavljuje SAMO neocekivane greske (5xx
  ili ne-HttpException) - ocekivane 4xx greske (validacija, 404, 403...) se
  ne prijavljuju (normalan tok kontrole, ne incident). Na mobile-u,
  `src/monitoring/sentry.ts` inicijalizuje SDK SAMO na iOS/Android (nikad na
  webu, isti princip kao `PurchasesService`) - stvarna native registracija
  ionako zahteva EAS build (vidi "EAS Build" iznad).
- **HTTP security header-i** (`helmet`) - ozicen globalno u `main.ts`
  (`app.use(helmet())`), postavlja standardne bezbednosne header-e
  (`X-Content-Type-Options`, `X-Frame-Options`, restriktivan
  `Content-Security-Policy` default, itd.) na svaki odgovor.
- **CORS** (`app.enableCors()`) - kontrolisan preko opcionog `CORS_ORIGIN`
  (`apps/api/src/common/cors.ts` `resolveCorsOrigin`). Bez njega dozvoljava
  sve origin-e (isti "placeholder-friendly" princip, bezbedno za lokalni
  razvoj i native mobile klijente); pred produkciju podesi na
  zarezom-odvojenu listu dozvoljenih origin-a ako postoji web klijent.
- **Guild lista** (`GET /guilds`) - `orderBy` sada ima `createdAt: "desc"`
  kao tiebreaker posle `totalXp: "desc"` (deterministicno umesto
  Postgres-ovog nedefinisanog redosleda za ceh-ove sa istim totalXp,
  najcesce sveze osnovani na 0) - vidi `GuildsService.listGuilds`.
- **OpenAPI/Swagger dokumentacija** (`apps/api/src/openapi/`) - generisana
  direktno iz istih Zod ugovora (`@risesolo/validation`) koje koristi
  `ZodValidationPipe` na serveru i `packages/api-client` na klijentu
  (`@asteasolutions/zod-to-openapi`), tako da su šeme u dokumentaciji tačan
  odraz stvarnih request/response tela - ne rucno odrzavani duplikat. Svih
  71 endpoint-a (18 kontrolera) je registrovano; Swagger UI je dostupan na
  `/docs` (i sirov JSON na `/docs-json`) SAMO kada `NODE_ENV !== "production"`
  (namerno iskljuceno na live serveru da ne siri attack surface).

## Lokalizacija (EN + SR)

Faza lansiranja podržava engleski (globalni podrazumevani jezik) i srpski
(regionalno tržište, isti tekst pokriva i hrvatski/bosanski korisnike po
odabiru jezika). "Gaming/anime" rečnik (XP, Level, Rank, Quest, TIER, Coins)
se namerno NE prevodi - ostaje identičan na svim jezicima.

- **`Profile.locale`** (`"en" | "sr"`, `@risesolo/domain` `Locale`) je
  server-authoritative izvor istine - postavlja se pri onboardingu (mobile
  šalje jezik uređaja preko `expo-localization`) ili kasnije u Settings
  ekranu (`POST /players/me/locale`, `apps/mobile/app/settings.tsx`).
- **Backend katalozi** (quest/item/shop nazivi - `apps/api/src/quests/*-catalog.ts`,
  `apps/api/src/inventory/*-catalog.ts`, `apps/api/src/shop/shop-catalog.ts`)
  primaju `locale` parametar (`apps/api/src/common/locale.ts` `resolveLocale`)
  i vraćaju odgovarajući tekst - svi pozivi imaju `DEFAULT_LOCALE` fallback
  pa su postojeći testovi bez eksplicitnog `locale` argumenta i dalje validni.
- **VAŽNO ograničenje**: Quest `title`/`description` se PERZISTIRAJU na
  generisanju (isti "generate once, persist" princip kao ostatak quest
  sistema) - promena jezika ne menja retroaktivno već generisan
  dnevni/nedeljni/boss/itd. quest za taj period, samo naredne. Shop/Inventory
  predmeti nemaju ovo ograničenje (ime/opis se računaju uživo na svakom GET-u).
- **AI-generisan tekst** (AI Quest/AI Item flavor iz `AiService`) je NAMERNO
  van obima ove faze - ostaje na srpskom bez obzira na `Profile.locale`.
- **Mobile UI chrome** (`apps/mobile/src/i18n`) - lagani custom `I18nContext`
  (`useI18n()` hook, `t("namespace.key")`), bez spoljne i18n biblioteke.
  Pokriveno: bas svaki ekran u `apps/mobile/app` (uklj. Nutrition, Shop,
  Leaderboard, Guild, Friends, Achievements, Inventory, Workout*, Training
  Plan, Paywall, Settings i `app/legal/{terms,privacy}.tsx`) - lokalizacija
  je zavrsena preko cele mobilne aplikacije.

## Testiranje

- `packages/*` - Jest + ts-jest, jedinični testovi uz izvorni kod (`*.test.ts`).
- `apps/api` - Jest (jedinični `*.spec.ts` + e2e `*.e2e-spec.ts` preko Supertest).
- `apps/mobile` - `jest-expo` preset + `@testing-library/react-native`.

### Test paket za napredni MVP

Pored modulskih testova, postoje slojevi koji štite spojeve između modula:

| Sloj | Gde | Šta proverava |
| --- | --- | --- |
| Integritet biblioteke vežbi | `apps/api/src/exercises/exercise-library.spec.ts` | `prisma/seed-data/exercise-library.json`: jedinstveni kebab-case slug, validni enum-i, neprazna uputstva/form cue-ovi/safety napomene, reps XOR hold propisivanje, skill lanci bez rupa i opadajuće težine |
| Exercises API e2e | `apps/api/test/exercises.e2e-spec.ts` | auth, filteri (tip/kategorija/težina), 400 na nepoznat enum, 404 na nepoznat slug, svaki red prolazi `exerciseSchema` |
| "Napredni MVP" journey | `apps/api/test/advanced-mvp-journey.e2e-spec.ts` | katalog → template → trening (reps + hold) → istorija/rekordi → progresija → leaderboard → guild XP → push token → shop; izolacija podataka između korisnika |
| Konkurentnost i invarijante | `apps/api/test/concurrency-invariants.e2e-spec.ts` | paralelna registracija (tačno jedan 201, ostali 409), paralelni start sesije (jedna `IN_PROGRESS`), paralelni complete ne dodeljuje XP dvaput, `totalXp == Σ XpEvent` |
| i18n paritet | `apps/mobile/src/i18n/locales/locales.test.ts` | `en`/`sr` imaju iste ključeve i iste `{placeholdere}`, nema praznih prevoda |
| UI komponente | `apps/mobile/src/ui/*.test.tsx`, `achievements/achievement-display.test.ts` | `Button`, `ErrorState`, `TextField`; svaki achievement ima naslov/opis/ikonu u oba jezika |

E2E testovi traže pokrenute Postgres (migrirana + seed-ovana baza) i Redis, sa istim
promenljivama kao u CI (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`).
Workspace paketi (`packages/*`) moraju biti buildovani (`pnpm build`) pre pokretanja
`apps/api` testova.

## CI

`.github/workflows/ci.yml` pokreće na svaki push/PR: install (`pnpm install --frozen-lockfile`),
lint, typecheck i test - identično lokalnim komandama iznad.

## Poznata ograničenja (trenutno stanje)

- Socket.IO/real-time nije ožičeno - Redis/BullMQ SU ožičeni (rate limit
  storage, push notifikacija red, read-kes za guild/leaderboard - vidi "Rate
  Limiting & Monitoring" iznad), ali za sada bez WebSocket/real-time sloja.
- Nema pune OpenAPI JSON generacije (Swagger) - DTO usklađenost se obezbeđuje
  deljenom Zod semom; uvodi se kada broj endpoint-a to opravda.
- `packages/domain` ima kernel + `gamification` modul implementiran; ostali
  bounded-context moduli (training, nutrition, community, economy, recovery)
  se dodaju u fazi kada se implementira odgovarajuća funkcija.
- Mobile ekrani (svaki ekran u `apps/mobile/app`) su povezani na sve backend
  endpoint-e preko `@risesolo/api-client` i provereni u pravom browseru
  (Playwright, `expo export --platform web`) - kompletan tok registracija ->
  onboarding -> trening (uklj. pauza/nastavak preko "Nastavi" bannera na
  Home-u) -> XP/level-up -> raspodela stat poena -> odjava radi sa pravim
  podacima sa servera. "Moji treninzi" (workout template-i) su dodati - vidi
  sekciju ispod, uz napomenu o preostalom ograničenju (nema vodjene sesije
  kroz SVE vezbe template-a odjednom).
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
- `app/legal/{terms,privacy}.tsx` sadrze stvaran pravni tekst (nije
  placeholder), preveden na EN/SR - i dalje je potrebna pravna revizija
  (uklj. GDPR/CCPA usaglasenost po ciljnim trzistima) pre produkcije.
- Push notifikacije: backend (registracija tokena, slanje preko Expo push
  servisa, trigeri) je implementiran i testiran, ali stvarna registracija
  tokena zahteva EAS `projectId` (`eas init`, vidi "Push Notifications"
  iznad) i standalone build za Android FCM kredencijale - do tada je
  registracija no-op. Nema scheduled/cron podsetnika (zahteva pravi scheduler
  koji jos nije ozicen) - samo event-driven trigeri.
