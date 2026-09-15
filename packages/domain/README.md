# @risesolo/domain

Domain kernel za RISESOLO modularni monolit - opste, poslovno-neutralne
building blocks (`Brand`, `Result`, `assertNever`) plus implementirani
bounded-context moduli.

## `gamification` (implementirano)

Cist domain sloj (bez I/O) za RISESOLO core gameplay loop. `total_xp` je
jedini izvor istine koji se perzistira; `level` i `rank` su UVEK izvedene
vrednosti (racunaju se iz `total_xp`/`level`), nikad se ne cuvaju odvojeno -
ovo sprecava nekonzistentna stanja (npr. `total_xp = 5000` ali `level`
ostao stara vrednost).

- `xp.ts` - `calculateLevel`, `calculateRequiredXP` (`level^2 * 100`),
  `calculateCurrentLevelXP`, `calculateProgress`, `detectLevelUp`.
- `rank.ts` - `calculateRank(level)`: E/D/C/B/A/S, deterministicka funkcija
  levela za MVP.
- `stats.ts` - Stat Points sistem: level up dodeljuje poene
  (`STAT_POINTS_PER_LEVEL`), igrac ih rucno raspodeljuje preko
  `allocateStatPoints` (Strength/Agility/Endurance/Vitality/Intelligence).
  Trening NIKAD direktno ne menja stat vrednosti.
- `rewards.ts` - fiksni XP/coin iznosi po izvoru (`XP_REWARDS`,
  `COIN_REWARDS`) - namerno bez random bonusa u MVP-u.
- `quest.ts` - `QuestStatus` lifecycle (`AVAILABLE -> IN_PROGRESS ->
  COMPLETED/EXPIRED`) i validacija dozvoljenih prelaza.
- `streak.ts` - `computeStreakAfterCompletion` (idempotentno za isti dan,
  +1 za uzastopni dan, reset na propusten dan).

Svaka funkcija je cista (bez pristupa bazi/mrezi) i ima jedinicne testove -
`apps/api` servisi (application sloj) je pozivaju i odgovorni su za
perzistenciju i idempotency (npr. unique constraint na `xp_events`).

## Planirane domain granice (buduce faze)

Svaka poslovna oblast dobija sopstveni podfolder pod `src/<context>/` u ovom
paketu (tipovi, invarijante, domain servisi bez I/O), sa ogledalskim modulom
u `apps/api/src/modules/<context>/` (kontroleri, use-case orkestracija,
perzistencija) - u skladu sa arhitektonskim pravilom da UI komponente i
transportni sloj ne smeju sadrzati poslovna pravila.

- `training` - personalizovani trening, baza vezbi, sesije, progressive overload
- `community` - izazovi, guild sistemi, rang-liste
- `economy` - prosireni gold/reward sistemi (van MVP fiksnih nagrada)
- `recovery` - oporavak, mobilnost, eksplozivnost

Ovi moduli se ne kreiraju prazni unapred - dodaju se u fazi u kojoj se
implementira odgovarajuca poslovna funkcija.
