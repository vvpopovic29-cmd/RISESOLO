# Faza 3 — Quest sistem

Čista domain pravila za Daily Quest — generisanje i lifecycle. Bez baze,
bez UI-ja; backend (Faza 2 DB + budući service sloj) i frontend treba da
zovu ove funkcije umesto da izmišljaju sopstvenu quest logiku.

## 1. Daily Quest generator (`quest.ts`, `definitions.ts`)

- `QUEST_DEFINITIONS` — MVP katalog od 6 generičkih quest šablona
  (namerno nezavisan od `data/exercises/*.json` dok se ne poveže Workout
  Engine u Fazi 5+).
- `pickQuestDefinition(userId, date)` — **deterministički** bira šablon
  (seed = `userId:date`, FNV-1a hash iz `kernel/hash.ts`). Isti korisnik +
  isti dan uvek dobija isti quest, bez potrebe za nasumičnošću.
- `generateDailyQuest(userId, date)` — čista funkcija, generiše nov
  `AVAILABLE` quest. `id` je stabilan (`daily-{userId}-{date}`), pa čak i
  ako dva paralelna zahteva istovremeno generišu quest za isti user+date
  PRE nego što DB provera stigne, oba generišu **identičan** red — DB
  unique constraint na `(user_id, date)` (Faza 2) tada samo dedup-uje,
  bez potrebe za distributed lock-om.
- `resolveDailyQuest(userId, date, existing)` — implementira tačno pravilo
  iz plana: *"Da li quest već postoji? DA → vrati postojeći, NE → generiši
  novi."* Servisni sloj prosleđuje red iz baze (ili `null`).

## 2. Quest lifecycle (`quest.ts`)

Jedine dozvoljene tranzicije:

```text
AVAILABLE -> IN_PROGRESS -> COMPLETED
AVAILABLE -> EXPIRED
IN_PROGRESS -> EXPIRED
```

- `updateQuestProgress(quest, progressValue, now)` — pomera
  `AVAILABLE -> IN_PROGRESS` čim progres pređe 0; odbija ažuriranje
  već završenog ili isteklog questa.
- `completeQuest(quest, now)` — **backend nikad ne veruje klijentovom
  `completed: true` flag-u.** Zahteva `progressValue >= targetValue`,
  inače vraća `TARGET_NOT_MET` sa tačnim brojevima. Na već `COMPLETED`
  questu vraća `ALREADY_COMPLETED` — drugi/treći klik na "Complete" ne
  daje drugu/treću nagradu (domain-level zaštita; DB sloj i dalje treba
  svoj idempotency key za sam XP event, Faza 2/6).
- `expireQuest(quest, now)` — **idempotentno** na već-`EXPIRED` questu
  (bezbedno za ponovljeno pokretanje cron/batch job-a koji ističe stare
  questove). Odbija isticanje već završenog questa i isticanje pre roka.

## Šta NIJE ovde (namerno)

- Perzistencija (`quests` / `user_quests` tabele, RLS) — Faza 2.
- Vezivanje quest-ova za stvarne workout sesije/exercise ID-jeve — Faza 5+
  (Workout Engine), kada `QUEST_DEFINITIONS` može da referencira
  `Exercise.id` iz `data/exercises/*.json`.
- Povezivanje nagrade (`reward.xp`) sa `applyXpGain` iz `../progression` -
  to radi Completion/XP Engine (Faza 6), koji uzima `reward` odavde kao
  ulaz.
