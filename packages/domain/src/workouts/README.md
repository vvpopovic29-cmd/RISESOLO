# Faza 5 — Workout

Čista domain pravila za Workout model — Template, Session i Set tracking.
Bez baze, bez UI-ja; isti obrazac kao Faza 1/3/4.

## 1. Workout model (`workout.types.ts`, `workout.ts`)

Namerno odvojena dva tipa, tačno po planu:

```text
WORKOUT (WorkoutTemplate, opciono)  ->  WORKOUT SESSION  ->  EXERCISES  ->  SETS
```

- `WorkoutTemplate` — reusable plan. `userId: null` označava sistemski/
  default template; isti template se može izvršiti kroz više session-a.
- `createWorkoutTemplate(...)` — validira (nepraznо ime, bar jedna vežba,
  `targetSets > 0`) i sama dodeljuje `order` po poziciji u nizu.
- `WorkoutSession` — jedno konkretno izvršenje. Može nastati:
  - `startWorkoutSessionFromTemplate(...)` — preslikava vežbe iz templatea
    (bez serija — one se popunjavaju kroz `logSet`), pamti
    `workoutTemplateId`.
  - `startFreeformWorkoutSession(...)` — bez templatea, korisnik bira
    vežbe u letu (`workoutTemplateId: null`).

## 2. Set tracking (`WorkoutSet`)

Jedan oblik za oba stila umesto dva tipa — polja koja se ne koriste
ostaju `null`:

- **Calisthenics**: `reps`, `durationSeconds`, `assistance`
- **Gym**: `weight`, `reps`

`logSet(session, exerciseId, setId, input)`:

- Odbija log ako `session.status !== "IN_PROGRESS"` (`NOT_IN_PROGRESS`).
- Odbija log za vežbu koja NIJE deo session-a — korisnik ne može da doda
  proizvoljnu vežbu mimo onoga sa čim je počeo (`EXERCISE_NOT_IN_SESSION`).
- `setNumber` se dodeljuje automatski (sledeći redni broj za tu vežbu) —
  klijent ga ne šalje.

## 3. Lifecycle

```text
IN_PROGRESS -> COMPLETED
IN_PROGRESS -> ABANDONED
```

- `completeWorkoutSession(session, now)` — zahteva bar JEDNU završenu
  (`completed: true`) seriju. Prazan/nikad-otpočeti trening se ne može
  "završiti" — isti princip kao `completeQuest` u Fazi 3 (backend
  potvrđuje stvaran napredak, ne veruje praznom kliku). Odbija dupli
  završetak (`ALREADY_COMPLETED`) i završetak već napuštenog session-a
  (`ALREADY_ABANDONED`).
- `abandonWorkoutSession(session, now)` — idempotentno na već-`ABANDONED`
  (bezbedno za ponovljeni poziv); odbija napuštanje već završenog
  session-a.

## 4. Summary (`computeWorkoutSessionSummary`)

Čista agregacija (`totalSets`, `completedSets`, `totalReps`,
`totalVolumeKg` = Σ `weight × reps`, `totalDurationSeconds`,
`durationMinutes` — samo kada je session `COMPLETED`). Ovo je ulaz za
Fazu 6 (Completion Engine), koji odavde računa XP i quest progress —
`computeWorkoutSessionSummary` sama **ne** dodeljuje XP niti dira
`applyXpGain` iz `../progression`.

## Šta NIJE ovde (namerno)

- Perzistencija (`workouts` / `workout_sessions` / `sets` tabele, RLS) —
  Faza 2.
- Povezivanje sa `exerciseId` validacijom protiv stvarnog exercise
  library-ja (`@risesolo/domain` exercises modul) — namerno odvojeno,
  `exerciseId` je slobodan string ovde; validacija "da li vežba stvarno
  postoji" je posao servisnog sloja (Faza 2/6), isto kao što su Quest
  definicije (Faza 3) ostale nezavisne od exercise library-ja.
- XP/quest-progress povezivanje na `completeWorkoutSession` — to je
  Completion Engine, Faza 6.
