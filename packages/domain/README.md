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
- `boss-quest.ts` - `isBossQuestComplete`: nedeljni izazov se zavrsava kada
  broj zavrsenih treninga te ISO nedelje dostigne `BOSS_QUEST_TARGET_SESSIONS`
  (progres se ne cuva posebno - racuna se prebrojavanjem WorkoutSession).
- `penalty.ts` - `calculatePenaltyCoins`/`applyCoinPenalty`: ako dnevni quest
  ostane nezavrsen do kraja dana, igrac gubi coins (nikad ispod 0); `total_xp`
  i stat poeni se namerno ne diraju - level ne sme da "padne".

Svaka funkcija je cista (bez pristupa bazi/mrezi) i ima jedinicne testove -
`apps/api` servisi (application sloj) je pozivaju i odgovorni su za
perzistenciju i idempotency (npr. unique constraint na `xp_events`).

## `training` (implementirano)

Podrska za AI trening planove (`apps/api/src/training-plans`, `apps/api/src/ai`).

- `candidates.ts` - `selectCandidateExercises(exercises, filters)`: cista
  funkcija koja filtrira katalog vezbi po tipu treninga i nivou iskustva
  igraca (nikad teze od `experienceLevel`), ograniceno na najvise
  `maxPerCategory` po kategoriji misica. Rezultat se salje AI modelu kao
  uzi, relevantan skup kandidata - ne ceo katalog - da model ne izmisli
  vezbu koja ne postoji.

## `nutrition` (implementirano)

Osnovno pracenje ishrane/unosa (`apps/api/src/nutrition`). Namerno bez
XP/coin nagrade - cist tracking alat, van core gameplay loop-a.

- `macros.ts` - `sumDailyMacros(entries)`: sabira kalorije/protein/ugljene
  hidrate/masti svih unosa jednog dana u dnevni rezime.

## Planirane domain granice (buduce faze)

Svaka poslovna oblast dobija sopstveni podfolder pod `src/<context>/` u ovom
paketu (tipovi, invarijante, domain servisi bez I/O), sa ogledalskim modulom
u `apps/api/src/modules/<context>/` (kontroleri, use-case orkestracija,
perzistencija) - u skladu sa arhitektonskim pravilom da UI komponente i
transportni sloj ne smeju sadrzati poslovna pravila.

- `community` - izazovi, guild sistemi, rang-liste
- `economy` - prosireni gold/reward sistemi (van MVP fiksnih nagrada)
- `recovery` - oporavak, mobilnost, eksplozivnost

Ovi moduli se ne kreiraju prazni unapred - dodaju se u fazi u kojoj se
implementira odgovarajuca poslovna funkcija.
