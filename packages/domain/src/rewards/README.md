# Faza 8 — Rewards (minimalni preview)

Ovo NIJE puna Faza 8. Sadrži samo `calculateCoinsForXp()` — determinističko
pravilo "koliko coina nosi X XP-a" (`COINS_PER_XP = 5`, zaokruženo na
dole), izdvojeno jer je **Fazi 6 (Completion Engine)** odmah potrebno da
vrati `coins_gained`/`coins` iz svog odgovora (deo je originalne
specifikacije Completion Engine-a, definisane pre nego što je Faza 8
razrađena zasebno).

Kada se puna ekonomija (shop, items, titles, boosters, zaštita od duple
nagrade preko `rewards` tabele) definiše u Fazi 8, ovaj odnos se menja
SAMO ovde — ništa drugo u kodu ne sme da duplira ovu formulu.
