# @risesolo/domain

Domain kernel za RISESOLO modularni monolit. Sadrzi opste, poslovno-neutralne
building blocks (`Brand`, `Result`, `assertNever`) koje koriste svi
bounded-context moduli, kao i implementirane domain module.

## Implementirani domain moduli

- `gamification` (Faza 2) - XP kriva, nivo, Hunter Rank, dodela poena
  statistike i quest status invarijante (`src/gamification/`). Cista logika
  bez I/O - koristi je `apps/api/src/player` i `apps/api/src/quests` za
  orkestraciju (perzistencija, HTTP).

## Planirane domain granice (buduce faze)

Svaka poslovna oblast dobija sopstveni podfolder pod `src/<context>/` u ovom
paketu (tipovi, invarijante, domain servisi bez I/O), sa ogledalskim modulom
u `apps/api/src/<context>/` (kontroleri, use-case orkestracija,
perzistencija) - u skladu sa arhitektonskim pravilom da UI komponente i
transportni sloj ne smeju sadrzati poslovna pravila.

- `training` - personalizovani trening, baza vezbi, sesije, progressive overload
- `nutrition` - ishrana, kalorije, makroi, obroci
- `community` - izazovi, guild sistemi, rang-liste
- `recovery` - oporavak, mobilnost, eksplozivnost

Ovi moduli se ne kreiraju prazni unapred - dodaju se u fazi u kojoj se
implementira odgovarajuca poslovna funkcija.
