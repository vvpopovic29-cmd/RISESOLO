# @risesolo/domain

Domain kernel za RISESOLO modularni monolit. U Fazi 1 sadrzi samo opste,
poslovno-neutralne building blocks (`Brand`, `Result`, `assertNever`) koje ce
koristiti svi buduci bounded-context moduli.

## Planirane domain granice (buduce faze)

Svaka poslovna oblast dobija sopstveni podfolder pod `src/<context>/` u ovom
paketu (tipovi, invarijante, domain servisi bez I/O), sa ogledalskim modulom
u `apps/api/src/modules/<context>/` (kontroleri, use-case orkestracija,
perzistencija) - u skladu sa arhitektonskim pravilom da UI komponente i
transportni sloj ne smeju sadrzati poslovna pravila.

- `training` - personalizovani trening, baza vezbi, sesije, progressive overload
- `nutrition` - ishrana, kalorije, makroi, obroci
- `gamification` - questovi, XP, nivoi, Hunter Rank
- `community` - izazovi, guild sistemi, rang-liste
- `economy` - gold i nagrade
- `recovery` - oporavak, mobilnost, eksplozivnost

Ovi moduli se ne kreiraju prazni unapred - dodaju se u fazi u kojoj se
implementira odgovarajuca poslovna funkcija.
