# Exercise library seed data

`exercise-library.json` (247 vezbi) je generisan iz `generate-exercise-library.py`
na osnovu RISESOLO exercise taksonomije (calisthenics stablo po
Beginner/Intermediate/Advanced tier-ovima, calisthenics skill progresije -
Handstand/L-Sit/Front Lever/Back Lever/Planche/Human Flag/Muscle-Up, i gym
exercise stablo). Da se izbegne rucno pisanje stotina JSON zapisa (i
neizbezne nekonzistentnosti), metapodaci se izvode pravilima:

- `equipment` - keyword detekcija iz naziva (dumbbell/barbell/cable/...).
- `movement_pattern` - keyword detekcija (push/pull/squat/hinge/isometric_hold/...).
- `primary_muscles` / `secondary_muscles` - mapiranje po (kategorija, potkategorija)
  za CALISTHENICS/GYM, i po skill grani za SKILL tip.
- `instructions` / `form_cues` / `safety_notes` - template po `movement_pattern`.
- `default_prescription` - sets/reps ili sets/hold_seconds (izometrijske vezbe)
  po `difficulty` tier-u.
- `progression` - `{ chain, order }` za vezbe koje pripadaju eksplicitnoj
  progresiji (calisthenics tier liste i skill stabla), koristi se za
  "sledeca/prethodna vezba u progresiji".

> **Napomena:** sadrzaj 206 ne-skill vezbi (`instructions`, `form_cues`, `safety_notes`,
> `primary_muscles`/`secondary_muscles`, `difficulty`, a kod vezbi sa istim tipom
> propisivanja i `sets`/`reps`/`rest_seconds`) je naknadno zamenjen sadrzajem iz
> uploadovane "risesolo-exercise-library" biblioteke (engleski tekst). Slug-ovi,
> `movement_pattern`, `equipment`, `progression` i 41 skill korak su ostali isti.
> Regenerisanje skriptom ispod VRACA stari (srpski, template) sadrzaj i pregazilo bi
> tu izmenu - ne pokretati je bez ponovnog spajanja.

Da se regenerise (npr. posle izmene taksonomije u skripti):

```bash
python3 apps/api/prisma/seed-data/generate-exercise-library.py
```

Ovo je **starter seed data** - template-generisani `instructions`/`form_cues`
tekst je namerno generican (bezbedan, ali ne editorijalno dotеran po vezbi).
Pre produkcije, dataset treba prosao kroz fitness-content review (formulacije
po vezbi, video/GIF reference - polje `video_url` namerno nije popunjeno).

`apps/api/prisma/seed.ts` ucitava ovaj fajl i upisuje ga u `Exercise` tabelu
(idempotentno, preko `slug` kao unique key - vidi FAZA "Prisma schema").
