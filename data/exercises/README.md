# RISESOLO Exercise Library (Faza 4 — EXERCISE DATABASE)

App-ready JSON exercise library generated from the RISESOLO exercise
taxonomy (gym + calisthenics + calisthenics skill progressions), now
backed by a runtime-validated, typed pipeline:

```text
data/exercises/*.json  (snake_case, sirov sadrzaj — ovaj folder)
        │  fs.readFile + JSON.parse
        ▼
@risesolo/validation   exerciseLibraryFileSchema / skillLibraryFileSchema /
                        progressionChainFileSchema (Zod, runtime granica)
        │  mapExerciseDtoToDomain / mapSkillLineDtoToDomain /
        │  mapProgressionChainDtoToDomain
        ▼
@risesolo/domain        Exercise / SkillLine / ProgressionChain (camelCase)
        │  filterExercisesByCategory, findExerciseById,
        │  resolveProgressionChainExercises, nextSkillStep, ...
        ▼
      apps/api / apps/mobile (buduci potrosaci — Faza 2/5+)
```

Nijedan potrošač (backend, mobilna app) ne treba da parsira ovaj JSON
ručno — uvek kroz `exerciseLibraryFileSchema.parse(...)` pa
`mapExerciseDtoToDomain(...)`, i onda kroz query helpere iz
`@risesolo/domain`. `packages/validation/src/contracts/exercise.data.test.ts`
je regresioni test koji stvarno čita ove fajlove i garantuje da su uvek
validni (uključujući end-to-end proveru celog pipeline-a).

## Files

| File | Contents |
| --- | --- |
| `calisthenics-exercises.json` | 117 calisthenics exercises across Chest, Back, Shoulders, Arms (Biceps/Triceps), Legs (Quads/Hamstrings/Glutes/Calves), Core, Full Body. |
| `gym-exercises.json` | 123 gym/equipment exercises across the same categories, Apple-Fitness+-style taxonomy (mix of bodyweight and loaded movements). |
| `calisthenics-skills.json` | 8 skill progression lines (Foundations, Handstand, L-Sit, Front Lever, Back Lever, Planche, Human Flag, Muscle-Up), 41 ordered steps total. |
| `progression-chains.json` | Named single-movement progression chains (currently: the explicit Push-Up progression from Beginner to Planche Push-Up). |

## Schema (per exercise)

Field names are `snake_case` to match a future Postgres/Supabase `exercises`
table directly. See `packages/validation/src/contracts/exercise.ts` for the
authoritative runtime (Zod) schema, and
`packages/domain/src/exercises/exercise.types.ts` for the camelCase
domain-layer shape the app should use after mapping (via
`packages/validation/src/mappers/exercise.mapper.ts`):

```jsonc
{
  "id": "cal-chest-standard-push-up",   // stable, human-readable id
  "name": "Standard Push-Up",
  "slug": "standard-push-up",
  "library": "CALISTHENICS",            // "CALISTHENICS" | "GYM"
  "category": "CHEST",                  // CHEST | BACK | SHOULDERS | ARMS | LEGS | CORE | FULL_BODY
  "subcategory": null,                  // BICEPS | TRICEPS | QUADRICEPS | HAMSTRINGS | GLUTES | CALVES | null
  "movement_pattern": "PUSH",           // PUSH | PULL | SQUAT | HINGE | CORE | SKILL_ISOMETRIC | FULL_BODY_CONDITIONING | ISOLATION | MOBILITY
  "difficulty": "BEGINNER",             // BEGINNER | INTERMEDIATE | ADVANCED
  "equipment": ["BODYWEIGHT"],
  "primary_muscles": ["Chest"],
  "secondary_muscles": ["Triceps", "Front Shoulders"],
  "instructions": ["..."],
  "form_cues": ["..."],
  "common_mistakes": ["..."],
  "safety_notes": ["..."],
  "default_sets": 3,
  "default_reps": "10-15",
  "tempo": "2-0-2",
  "rest_seconds": 45,
  "xp_value": 8,
  "media": { "thumbnail_url": null, "video_url": null, "gif_url": null },
  "tags": ["chest", "push"]
}
```

`calisthenics-skills.json` skill steps use the same `difficulty`/`equipment`
fields plus `hold_target_seconds` and `is_skill_mastery` (true on the final
step of the line — e.g. `Muscle-Up`, `Full Planche`, `Full Front Lever`).

## Query helpers (`@risesolo/domain`)

Pure functions operating on already-mapped `Exercise[]` / `SkillLine[]` /
`ProgressionChain[]` arrays — no I/O, fully unit tested:

- `findExerciseById`, `findExerciseBySlug`
- `filterExercisesByCategory`, `filterExercisesByDifficulty`,
  `filterExercisesByAvailableEquipment`, `groupExercisesByCategory`
- `findSkillLine`, `firstSkillStep`, `masterySkillStep`, `nextSkillStep`
  (the building block for a future "suggest the next skill" AI feature)
- `findProgressionChain`, `resolveProgressionChainExercises`

## How the raw content was generated

Difficulty, equipment, primary/secondary muscles, movement pattern, and the
instructions/form-cues/common-mistakes/safety-notes text were derived
programmatically (keyword rules + per-movement-pattern templates) from the
source taxonomy to guarantee consistent structure and full coverage across
~240 exercises. Treat the copy as a solid first draft: swap in
photographer/video-verified instructions and safety notes per exercise as
the content team reviews them — the `media` block is left `null` for that
reason. `xp_value` and `default_sets/reps/tempo/rest` are reasonable
difficulty-based defaults, not final game-balance numbers (that's Faza 1 —
XP RULES — already locked in `packages/domain/src/progression`).

## Suggested next steps

1. Review/adjust the generated instructions, form cues, and safety notes
   where domain expertise disagrees with the template defaults.
2. Add real thumbnail/video/gif asset URLs to the `media` block.
3. Migrate this into the Supabase `exercises` table (Faza 2) with a seed
   script that reuses `exerciseLibraryFileSchema.parse` +
   `mapExerciseDtoToDomain` from `@risesolo/validation`/`@risesolo/domain`.
4. Extend `progression-chains.json` with the remaining implied chains (e.g.
   Pull-Up, Squat, Dip) beyond the explicit Push-Up example.
5. Wire `QUEST_DEFINITIONS` (Faza 3, `packages/domain/src/quests`) to real
   `Exercise.id`s once the Workout Engine (Faza 5) exists.
