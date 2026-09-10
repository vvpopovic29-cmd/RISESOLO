# @risesolo/domain

Domain kernel za RISESOLO modularni monolit. U Fazi 1 sadrzi samo opste,
poslovno-neutralne building blocks (`Brand`, `Result`, `assertNever`) koje ce
koristiti svi buduci bounded-context moduli.

## Domain granice

Svaka poslovna oblast dobija sopstveni podfolder pod `src/<context>/` u ovom
paketu (tipovi, invarijante, domain servisi bez I/O), sa ogledalskim modulom
u `apps/api/src/modules/<context>/` (kontroleri, use-case orkestracija,
perzistencija) - u skladu sa arhitektonskim pravilom da UI komponente i
transportni sloj ne smeju sadrzati poslovna pravila.

- `gamification` (Faza 2) - XP formula, level-up, quest completability. Ove
  cisto funkcije su ogledalo SECURITY DEFINER funkcija u
  `supabase/migrations/` (`fn_grant_xp`, `fn_complete_daily_quest`, ...) -
  baza je izvor istine za stvarne mutacije (atomicnost + idempotencija),
  a `packages/domain` sluzi za read-only preview izracunavanja i za testove
  koji dokumentuju formulu.
- `training` (Faza 3) - Progressive Overload signal (Epley 1RM procena,
  poredjenje poslednje dve trening sesije po vezbi). Baza vezbi, sesije i
  workout logika i dalje zive u `apps/api/src/modules/workout` (I/O sloj);
  ovaj podfolder sadrzi samo cist izracun trenda.
- `nutrition` - ishrana, kalorije, makroi, obroci (Nutrition XP i logovanje
  su implementirani u `apps/api/src/modules/nutrition`, Faza 3; ovaj domain
  podfolder se dodaje kada se pojavi prva cista poslovna logika koja to
  opravdava, npr. adherence % izracun)
- `community` - izazovi, guild sistemi, rang-liste
- `economy` - gold i nagrade (delimicno pokriveno kroz `gamification` u Fazi 2)
- `recovery` - oporavak, mobilnost, eksplozivnost

Moduli koji jos nisu na listi iznad se ne kreiraju prazni unapred - dodaju se
u fazi u kojoj se implementira odgovarajuca poslovna funkcija.
