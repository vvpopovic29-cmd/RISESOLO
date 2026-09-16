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

## `guild` (implementirano)

Guild sistem (`apps/api/src/guilds`) - 5 stubova iz "Phase 2" liste u jednom
modulu: Guild Management, Guild Progression, Guild Quests & Raids, Social &
Chat (osnovna, bez real-time infrastrukture - Redis/Socket.IO nisu ozicena),
Guild Treasury & Rewards.

- `roles.ts` - `GUILD_ROLES` (LEADER/OFFICER/MEMBER), `GUILD_MEMBER_CAP`,
  `canKick`/`canChangeRole`/`canDistributeTreasury` - cista permission
  pravila, bez pristupa bazi.
- `succession.ts` - `selectNextLeader`: kada LEADER napusti ceh, bira se
  najstariji OFFICER (ili najstariji MEMBER ako nema OFFICER-a); `null` ako
  ceh ostaje prazan (raspustanje).
- `contribution.ts` - `calculateGuildXpContribution`: fiksan procenat
  (`GUILD_XP_CONTRIBUTION_RATE`) licnog XP-a od svakog treninga automatski
  ide u cehovski `total_xp` (isti princip kao licni: jedini izvor istine,
  nivo se uvek izvodi preko `@risesolo/domain` `calculateLevel`).
- `raid.ts` - `isGuildRaidComplete`: nedeljni cehovski izazov (ogledalo
  licnog Boss Quest-a) se zavrsava kada zbir zavrsenih treninga SVIH
  clanova te ISO nedelje dostigne `GUILD_RAID_TARGET_CONTRIBUTIONS`.
- `treasury.ts` - `distributeTreasury`: LEADER deli riznicu ravnomerno
  svim clanovima; ostatak od celobrojnog deljenja ostaje u riznici.

## Planirane domain granice (buduce faze)

Svaka poslovna oblast dobija sopstveni podfolder pod `src/<context>/` u ovom
paketu (tipovi, invarijante, domain servisi bez I/O), sa ogledalskim modulom
u `apps/api/src/modules/<context>/` (kontroleri, use-case orkestracija,
perzistencija) - u skladu sa arhitektonskim pravilom da UI komponente i
transportni sloj ne smeju sadrzati poslovna pravila.

- `community` - rang-liste, prijateljstva
- `economy` - prosireni gold/reward sistemi (van MVP fiksnih nagrada)
- `recovery` - oporavak, mobilnost, eksplozivnost

Ovi moduli se ne kreiraju prazni unapred - dodaju se u fazi u kojoj se
implementira odgovarajuca poslovna funkcija.
