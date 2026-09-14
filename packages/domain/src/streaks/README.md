# Faza 9 — Streak (minimalni preview)

Ovo NIJE puna Faza 9 (Penalty Quest, streak freeze/recovery, notifikacije
"ne prekidaj niz"). Sadrži samo "update-on-activity" pravilo koje je
**Fazi 6 (Completion Engine)** odmah potrebno da vrati `streak` iz svog
odgovora.

## Pravilo (iz plana)

```text
complete today's required activity  ->  streak + 1
korisnik preskoci dan                ->  streak -> 0
```

## Dve funkcije, dve odgovornosti

- `updateStreakForActivity(state, activityDate)` — poziva se KAD SE
  desi aktivnost (npr. iz `completeWorkout`, Faza 6). Idempotentno
  unutar istog dana (druga aktivnost istog dana ne duplira streak). Ako
  je poslednja aktivnost bila juče, streak raste; inače (prvi put, ili
  posle propuštenog dana) streak počinje iznova od 1.
- `computeDisplayedStreak(state, today)` — čisto ČITANJE, ne menja
  sačuvano stanje. Vraća 0 ako je poslednja aktivnost bila pre 2+ dana
  (streak je logički prekinut), inače `state.currentStreak`. Isti princip
  kao `hasExpired()` u Fazi 3 (Quest): nema potrebe za pozadinskim cron
  job-om koji "gasi" streak tačno u ponoć — UI/backend na svakom čitanju
  (Dashboard) lenjo računa stvaran prikazani streak iz sačuvanog stanja +
  današnjeg datuma.

## Šta NIJE ovde (namerno)

- Perzistencija (`streaks` tabela) — Faza 2.
- Penalty Quest (kazna za prekid niza) — eksplicitno odloženo, pomenuto u
  originalnom planu kao "ne uvodimo još".
- Streak freeze/recovery (kupovina "zamrzavanja" niza za coins) — Faza 8+
  proširenje, zavisi od pune Rewards ekonomije.
