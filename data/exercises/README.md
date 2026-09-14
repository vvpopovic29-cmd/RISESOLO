# RISESOLO Exercise Library (Faza 4 seed data)

App-ready JSON exercise library generated from the RISESOLO exercise taxonomy
(gym + calisthenics + calisthenics skill progressions). Matching TypeScript
domain types live in `packages/domain/src/exercises/exercise.types.ts`.

This dataset is reference/seed content, not application code: it is meant to
be consumed by the future **FAZA 4 — Exercise Database** work (seeding the
Supabase `exercises` table) and/or bundled as a client-side fallback dataset.
It intentionally contains no business logic and grants no XP by itself — XP
values here (`xp_value`) are only suggested defaults for the server-side XP
engine (Faza 6/completion engine) to consume, not authoritative values.

## Files

| File | Contents |
| --- | --- |
| `calisthenics-exercises.json` | 117 calisthenics exercises across Chest, Back, Shoulders, Arms (Biceps/Triceps), Legs (Quads/Hamstrings/Glutes/Calves), Core, Full Body. |
| `gym-exercises.json` | 123 gym/equipment exercises across the same categories, Apple-Fitness+-style taxonomy (mix of bodyweight and loaded movements). |
| `calisthenics-skills.json` | 8 skill progression lines (Foundations, Handstand, L-Sit, Front Lever, Back Lever, Planche, Human Flag, Muscle-Up), 41 ordered steps total. |
| `progression-chains.json` | Named single-movement progression chains (currently: the explicit Push-Up progression from Beginner to Planche Push-Up). |

## Schema (per exercise)

Field names are `snake_case` to match a future Postgres/Supabase `exercises`
table directly (see `packages/domain/src/exercises/exercise.types.ts` for the
camelCase domain-layer shape the app should map onto after loading):

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

## How this was generated

Difficulty, equipment, primary/secondary muscles, movement pattern, and the
instructions/form-cues/common-mistakes/safety-notes text were derived
programmatically (keyword rules + per-movement-pattern templates) from the
source taxonomy to guarantee consistent structure and full coverage across
~240 exercises. Treat the copy as a solid first draft: swap in
photographer/video-verified instructions and safety notes per exercise as
the content team reviews them — the `media` block is left `null` for that
reason. `xp_value` and `default_sets/reps/tempo/rest` are reasonable
difficulty-based defaults, not final game-balance numbers (that's Faza 1 —
XP RULES — to finalize).

## Suggested next steps (per the RISESOLO MVP roadmap)

1. Review/adjust the generated instructions, form cues, and safety notes
   where domain expertise disagrees with the template defaults.
2. Add real thumbnail/video/gif asset URLs to the `media` block.
3. Migrate this into the Supabase `exercises` table (Faza 4) with a seed
   script that maps these `snake_case` fields 1:1 onto table columns.
4. Extend `progression-chains.json` with the remaining implied chains (e.g.
   Pull-Up, Squat, Dip) beyond the explicit Push-Up example.
