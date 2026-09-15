# Faza 6 — Completion Engine

Srce MVP-a. `completeWorkout()` spaja Fazu 1 (XP/Rank), Fazu 3 (Quest),
Fazu 4 (Exercise xpValue), Fazu 5 (Workout Session) i minimalne
Faza 8/9 preview module (Coins, Streak) u jedan orkestrisan tok — tačno
onaj iz plana:

```text
COMPLETE WORKOUT
   ↓
Backend validation   (ponovo koristi Fazu 5 — completeWorkoutSession)
   ↓
Create XP Event / Calculate XP   (Faza 4 — xpValue po vežbi)
   ↓
Calculate Level / Check level-up   (Faza 1)
   ↓
Check Rank   (Faza 1)
   ↓
Grant coins   (Faza 8 — minimalni preview)
   ↓
Update quest   (Faza 3)
   ↓
Update streak   (Faza 9 — minimalni preview)
   ↓
Return new Player State
```

Server je jedini autoritet: klijent nikad sam ne šalje `xp_gained`,
`coins`, ili `level` — sve se računa ovde, isključivo iz stvarno
završenih (`completed: true`) serija u session-u.

## Kako se računa XP

`workoutXpGained` = zbir `exercise.xpValue` (Faza 4 katalog) za **svaku
završenu seriju** u treningu. Vežba koja nije pronađena u prosleđenom
`exercises` katalogu doprinosi 0 XP umesto da baci grešku — ne blokira
završetak treninga zbog npr. zastarelog/uklonjenog exercise ID-ja.

Ako je istovremeno prosleđen `activeQuest` i njegov cilj bude dostignut
OVIM treningom, quest-ova nagrada (`reward.xp`) se dodaje **na vrh**
workout XP-a kao DRUGI, odvojeni XP event (isti `applyXpGain` iz Faze 1
se primenjuje dva puta uzastopno — prvo workout, pa quest — tako da
level-up može da se desi zbog bilo kog od njih, ili zbog oba zajedno).

## Quest integracija — namerno ograničenje

Quest (Faza 3) i dalje ne zna za konkretne `exerciseId`-jeve (namerna
odluka iz Faze 3). `estimateQuestProgressDelta()` zato aproksimira
napredak iz `quest.unit`:

- `"workouts"` → +1 (jedan završen trening)
- `"minutes"` → `summary.durationMinutes`
- `"seconds"` → `summary.totalDurationSeconds`
- `"reps"` → `summary.totalReps` (**ukupno u CELOM treningu**, ne samo za
  vežbu na koju quest cilja — npr. "50 Push-Ups" bi se računao i ako su ti
  reps-ovi zapravo čučnjevi). Ovo je poznato MVP pojednostavljenje, tačno
  onoliko precizno koliko Quest sistem trenutno dozvoljava; precizira se
  kad se quest-ovi povežu sa konkretnim `exerciseId`-jevima (Faza 5+
  proširenje pomenuto u `quests/README.md`).

**Quest neuspeh NIKAD ne blokira trening.** Ako je quest već `COMPLETED`/
`EXPIRED`, ili `updateQuestProgress`/`completeQuest` vrati grešku iz bilo
kog razloga, `completeWorkout()` to tiho ignoriše (`quest: null` u
rezultatu) — trening, XP, level, rank, coins i streak se svejedno
računaju i vraćaju.

## Coins i Streak — namerno minimalni

`packages/domain/src/rewards/coins.ts` (Faza 8 preview) i
`packages/domain/src/streaks/streak.ts` (Faza 9 preview) postoje SAMO
zato što ih Completion Engine-ov ugovoreni odgovor (`coins_gained`,
`coins`, `streak`) zahteva već sada. Ovo NISU pune Faza 8 (shop, items,
titles) i Faza 9 (Penalty Quest, streak freeze) implementacije — pogledaj
njihove README/komentare za tačan obim.

## Šta NIJE ovde (namerno)

- Perzistencija (`xp_events`, `workout_sessions`, transakciono pisanje u
  Supabase) — Faza 2. `completeWorkout()` je čista funkcija: prima
  trenutno stanje (previousTotalXp/previousStreak/previousCoins) kao
  parametre i vraća NOVO stanje — ne čita niti piše bazu.
- Idempotency zaštita od duplog HTTP zahteva za isti "complete workout"
  klik — to je posao `workout_sessions`/`xp_events` unique constraint-a
  (Faza 2), isto kao što je već dokumentovano u Fazi 1 za XP evente.
- Level Up ekran/UI efekat (Faza 7) — `completeWorkout()` samo vraća
  `levelUp: boolean`, `previousLevel`/`newLevel` i `statPointsAwarded`
  (`calculateStatPointsAwarded(previousLevel, newLevel)` iz Faze 1);
  frontend odlučuje kako to prikazuje.
- Upis `statPointsAwarded` u `player_stats.unspent_points` — to je
  perzistencija (apps/api sloj, isto kao xp_events/progression), ne
  domain logika. `completeWorkout()` samo IZRAČUNAVA koliko poena treba
  dodeliti; `grantStatPoints()` (Faza 1) ih stvarno dodaje na postojeće
  stanje, a to poziva `WorkoutsService`/`PlayersService` u `apps/api`
  nakon uspešnog `completeWorkout()` poziva.
