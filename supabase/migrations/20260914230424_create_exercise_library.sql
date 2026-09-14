-- Faza 4 (Exercise Database) - struktura tacno prati
-- packages/validation/src/contracts/exercise.ts (Zod sema) i
-- data/exercises/*.json (snake_case polja 1:1 sa kolonama). Javni,
-- referentni sadrzaj - citljiv svima, pisu samo migracije/service_role.

create table public.exercises (
  id text primary key,
  name text not null,
  slug text not null unique,
  library text not null check (library in ('CALISTHENICS', 'GYM')),
  category text not null check (
    category in ('CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'LEGS', 'CORE', 'FULL_BODY')
  ),
  subcategory text null check (
    subcategory is null
    or subcategory in ('BICEPS', 'TRICEPS', 'QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'CALVES')
  ),
  movement_pattern text not null,
  difficulty text not null check (difficulty in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  equipment text[] not null,
  primary_muscles text[] not null,
  secondary_muscles text[] not null default '{}',
  instructions text[] not null,
  form_cues text[] not null default '{}',
  common_mistakes text[] not null default '{}',
  safety_notes text[] not null,
  default_sets integer not null check (default_sets > 0),
  default_reps text not null,
  tempo text not null,
  rest_seconds integer not null check (rest_seconds >= 0),
  xp_value integer not null check (xp_value >= 0),
  thumbnail_url text null,
  video_url text null,
  gif_url text null,
  tags text[] not null default '{}'
);
comment on table public.exercises is 'Faza 4 exercise library, seedovan iz data/exercises/{calisthenics,gym}-exercises.json preko exerciseLibraryFileSchema.parse().';

alter table public.exercises enable row level security;

create policy exercises_select_all on public.exercises
  for select to anon, authenticated
  using (true);

create index idx_exercises_category on public.exercises (category);
create index idx_exercises_library on public.exercises (library);

create table public.skill_lines (
  id text primary key,
  name text not null,
  primary_muscles text[] not null,
  description text not null
);
comment on table public.skill_lines is 'Faza 4 calisthenics skill progresije (Handstand, Planche, ...), iz data/exercises/calisthenics-skills.json.';

alter table public.skill_lines enable row level security;

create policy skill_lines_select_all on public.skill_lines
  for select to anon, authenticated
  using (true);

create table public.skill_steps (
  id text primary key,
  skill_line_id text not null references public.skill_lines (id) on delete cascade,
  order_index integer not null check (order_index > 0),
  name text not null,
  difficulty text not null check (difficulty in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  equipment text[] not null,
  hold_target_seconds integer null,
  is_skill_mastery boolean not null default false,
  unique (skill_line_id, order_index)
);

alter table public.skill_steps enable row level security;

create policy skill_steps_select_all on public.skill_steps
  for select to anon, authenticated
  using (true);

create table public.progression_chains (
  id text primary key,
  name text not null,
  category text not null,
  -- niz exercise ID-jeva (ili null za nepoznat korak), redosledom najlaksa -> najteza varijanta.
  steps jsonb not null
);
comment on table public.progression_chains is 'Faza 4 imenovani lanci progresije (npr. Push-Up Progression), iz data/exercises/progression-chains.json.';

alter table public.progression_chains enable row level security;

create policy progression_chains_select_all on public.progression_chains
  for select to anon, authenticated
  using (true);
