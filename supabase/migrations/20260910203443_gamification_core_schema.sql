-- RISESOLO Faza 2 — Gamification core schema
-- Player → Stats → XP → Level → Daily Quest → Workout → Rewards
--
-- Security model:
--   - RLS is enabled on every table; authenticated users may only SELECT
--     their own rows. There are no INSERT/UPDATE/DELETE policies for the
--     `authenticated` role: every mutation that affects XP, level, coins,
--     stat points, quest progress or personal records happens inside a
--     SECURITY DEFINER function, callable only by `service_role` (the
--     NestJS backend). This keeps the backend as the single source of
--     truth even if the mobile app ever talks to Supabase directly.
--   - SECURITY DEFINER functions bypass RLS, so EXECUTE is revoked from
--     PUBLIC and granted only to service_role on every one of them.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.players (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Hunter',
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  stat_points_available integer not null default 0 check (stat_points_available >= 0),
  rank text not null default 'E' check (rank in ('E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS')),
  class text check (
    class is null
    or class in (
      'strength_hunter',
      'speed_hunter',
      'endurance_hunter',
      'bodybuilder',
      'calisthenics_hunter',
      'balanced_hunter'
    )
  ),
  coins integer not null default 0 check (coins >= 0),
  hp integer not null default 100 check (hp >= 0),
  strength integer not null default 1 check (strength >= 0),
  agility integer not null default 1 check (agility >= 0),
  endurance integer not null default 1 check (endurance >= 0),
  vitality integer not null default 1 check (vitality >= 0),
  intelligence integer not null default 1 check (intelligence >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_activity_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.players is
  'One row per Player. XP/level/coins/stat points are only ever mutated by the fn_grant_xp / fn_grant_reward SECURITY DEFINER functions, never by direct client writes.';

-- XP ledger: also the idempotency guard for XP grants. The unique
-- constraint on (player_id, source, source_ref_id) means replaying the
-- same event (e.g. a retried "complete workout" request) never grants XP
-- twice.
create table public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  amount integer not null check (amount > 0),
  source text not null,
  source_ref_id uuid,
  created_at timestamptz not null default now(),
  unique (player_id, source, source_ref_id)
);

create index xp_transactions_player_id_idx on public.xp_transactions (player_id);

create table public.reward_transactions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  stat_points integer not null default 0 check (stat_points >= 0),
  source text not null,
  source_ref_id uuid,
  created_at timestamptz not null default now(),
  unique (player_id, source, source_ref_id)
);

create index reward_transactions_player_id_idx on public.reward_transactions (player_id);

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  type text not null check (type in ('daily', 'weekly', 'main', 'side', 'boss', 'hidden', 'penalty')),
  title text not null,
  description text,
  -- when set, fn_log_workout (and future fn_log_* functions) auto-progress
  -- any active quest of this linked_action after the matching activity.
  linked_action text check (linked_action is null or linked_action in ('workout', 'water', 'nutrition')),
  target_count integer not null default 1 check (target_count > 0),
  progress_count integer not null default 0 check (progress_count >= 0),
  xp_reward integer not null default 0 check (xp_reward >= 0),
  coin_reward integer not null default 0 check (coin_reward >= 0),
  status text not null default 'active' check (status in ('active', 'completed', 'failed', 'expired')),
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index quests_player_id_status_idx on public.quests (player_id, status);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  muscle_groups text[] not null default '{}',
  equipment text
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  performed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index workouts_player_id_idx on public.workouts (player_id);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  set_number integer not null default 1 check (set_number > 0),
  reps integer not null check (reps > 0),
  weight_kg numeric(6, 2) not null check (weight_kg >= 0),
  created_at timestamptz not null default now()
);

create index workout_sets_workout_id_idx on public.workout_sets (workout_id);
create index workout_sets_exercise_id_idx on public.workout_sets (exercise_id);

-- Personal records are kept as history (one row per PR ever set), so the
-- current PR for an exercise is `max(weight_kg)` — this also gives the
-- player a PR timeline for free.
create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  weight_kg numeric(6, 2) not null check (weight_kg >= 0),
  reps integer not null check (reps > 0),
  workout_id uuid references public.workouts (id) on delete set null,
  achieved_at timestamptz not null default now()
);

create index personal_records_player_exercise_idx on public.personal_records (player_id, exercise_id);

-- ---------------------------------------------------------------------------
-- updated_at bookkeeping
-- ---------------------------------------------------------------------------

create function public.fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_players_set_updated_at
  before update on public.players
  for each row
  execute function public.fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — read-your-own-data only, all writes via
-- SECURITY DEFINER functions callable only by service_role.
-- ---------------------------------------------------------------------------

alter table public.players enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.reward_transactions enable row level security;
alter table public.quests enable row level security;
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.personal_records enable row level security;

create policy players_select_own on public.players
  for select to authenticated
  using (auth.uid() = id);

create policy xp_transactions_select_own on public.xp_transactions
  for select to authenticated
  using (auth.uid() = player_id);

create policy reward_transactions_select_own on public.reward_transactions
  for select to authenticated
  using (auth.uid() = player_id);

create policy quests_select_own on public.quests
  for select to authenticated
  using (auth.uid() = player_id);

create policy exercises_select_all on public.exercises
  for select to authenticated, anon
  using (true);

create policy workouts_select_own on public.workouts
  for select to authenticated
  using (auth.uid() = player_id);

create policy workout_sets_select_own on public.workout_sets
  for select to authenticated
  using (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_sets.workout_id
        and w.player_id = auth.uid()
    )
  );

create policy personal_records_select_own on public.personal_records
  for select to authenticated
  using (auth.uid() = player_id);

-- ---------------------------------------------------------------------------
-- New-user bootstrap: create a Player row the moment a Supabase Auth user
-- is created, so the app never has to special-case "no player yet".
-- ---------------------------------------------------------------------------

create function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.players (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Hunter')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.fn_handle_new_user();

-- ---------------------------------------------------------------------------
-- fn_grant_xp — atomic, idempotent XP grant + level-up.
--
-- XP required for the next level mirrors
-- packages/domain/src/gamification/xp.ts::xpRequiredForLevel:
--   xpToNextLevel(level) = level^2 * 100
-- Keep both in sync if the formula ever changes.
-- ---------------------------------------------------------------------------

create function public.fn_grant_xp(
  p_player_id uuid,
  p_amount integer,
  p_source text,
  p_source_ref_id uuid default null
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
  v_xp_to_next integer;
  v_levels_gained integer := 0;
begin
  if p_amount <= 0 then
    raise exception 'xp amount must be positive, got %', p_amount;
  end if;

  insert into public.xp_transactions (player_id, amount, source, source_ref_id)
  values (p_player_id, p_amount, p_source, p_source_ref_id)
  on conflict (player_id, source, source_ref_id) do nothing;

  if not found then
    -- Duplicate event (same source + source_ref_id already recorded):
    -- return current state unchanged instead of granting XP twice.
    select * into v_player from public.players where id = p_player_id;
    return v_player;
  end if;

  select * into v_player from public.players where id = p_player_id for update;
  if not found then
    raise exception 'player % not found', p_player_id;
  end if;

  v_player.xp := v_player.xp + p_amount;

  loop
    v_xp_to_next := v_player.level ^ 2 * 100;
    exit when v_player.xp < v_xp_to_next;
    v_player.xp := v_player.xp - v_xp_to_next;
    v_player.level := v_player.level + 1;
    v_levels_gained := v_levels_gained + 1;
  end loop;

  update public.players
    set xp = v_player.xp,
        level = v_player.level,
        stat_points_available = stat_points_available + (v_levels_gained * 3)
    where id = p_player_id;

  select * into v_player from public.players where id = p_player_id;
  return v_player;
end;
$$;

revoke execute on function public.fn_grant_xp(uuid, integer, text, uuid) from public;
grant execute on function public.fn_grant_xp(uuid, integer, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- fn_grant_reward — atomic, idempotent coins/stat points grant.
-- ---------------------------------------------------------------------------

create function public.fn_grant_reward(
  p_player_id uuid,
  p_coins integer,
  p_stat_points integer,
  p_source text,
  p_source_ref_id uuid default null
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
begin
  if p_coins < 0 or p_stat_points < 0 then
    raise exception 'reward amounts must be non-negative (coins=%, stat_points=%)', p_coins, p_stat_points;
  end if;

  if p_coins = 0 and p_stat_points = 0 then
    select * into v_player from public.players where id = p_player_id;
    return v_player;
  end if;

  insert into public.reward_transactions (player_id, coins, stat_points, source, source_ref_id)
  values (p_player_id, p_coins, p_stat_points, p_source, p_source_ref_id)
  on conflict (player_id, source, source_ref_id) do nothing;

  if not found then
    select * into v_player from public.players where id = p_player_id;
    return v_player;
  end if;

  update public.players
    set coins = coins + p_coins,
        stat_points_available = stat_points_available + p_stat_points
    where id = p_player_id
    returning * into v_player;

  return v_player;
end;
$$;

revoke execute on function public.fn_grant_reward(uuid, integer, integer, text, uuid) from public;
grant execute on function public.fn_grant_reward(uuid, integer, integer, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- fn_update_streak — daily-activity streak bookkeeping. Safe to call more
-- than once for the same day (no-op on repeat).
-- ---------------------------------------------------------------------------

create function public.fn_update_streak(
  p_player_id uuid,
  p_activity_date date
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
begin
  select * into v_player from public.players where id = p_player_id for update;
  if not found then
    raise exception 'player % not found', p_player_id;
  end if;

  if v_player.last_activity_date = p_activity_date then
    return v_player;
  elsif v_player.last_activity_date = p_activity_date - 1 then
    v_player.current_streak := v_player.current_streak + 1;
  else
    v_player.current_streak := 1;
  end if;

  update public.players
    set current_streak = v_player.current_streak,
        longest_streak = greatest(longest_streak, v_player.current_streak),
        last_activity_date = p_activity_date
    where id = p_player_id
    returning * into v_player;

  return v_player;
end;
$$;

revoke execute on function public.fn_update_streak(uuid, date) from public;
grant execute on function public.fn_update_streak(uuid, date) to service_role;

-- ---------------------------------------------------------------------------
-- fn_complete_daily_quest — validates progress, marks the quest completed,
-- grants its XP/coin reward and (for daily quests) bumps the streak. Safe
-- to call more than once: a non-active quest is returned unchanged.
-- ---------------------------------------------------------------------------

create function public.fn_complete_daily_quest(
  p_player_id uuid,
  p_quest_id uuid
)
returns public.quests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quest public.quests;
begin
  select * into v_quest
    from public.quests
    where id = p_quest_id and player_id = p_player_id
    for update;

  if not found then
    raise exception 'quest % not found for player %', p_quest_id, p_player_id;
  end if;

  if v_quest.status <> 'active' then
    return v_quest;
  end if;

  if v_quest.progress_count < v_quest.target_count then
    raise exception
      'quest % progress % has not reached target %', p_quest_id, v_quest.progress_count, v_quest.target_count;
  end if;

  update public.quests
    set status = 'completed', completed_at = now()
    where id = p_quest_id;

  if v_quest.xp_reward > 0 then
    perform public.fn_grant_xp(p_player_id, v_quest.xp_reward, 'quest:' || v_quest.type, p_quest_id);
  end if;

  if v_quest.coin_reward > 0 then
    perform public.fn_grant_reward(p_player_id, v_quest.coin_reward, 0, 'quest:' || v_quest.type, p_quest_id);
  end if;

  if v_quest.type = 'daily' then
    perform public.fn_update_streak(p_player_id, current_date);
  end if;

  select * into v_quest from public.quests where id = p_quest_id;
  return v_quest;
end;
$$;

revoke execute on function public.fn_complete_daily_quest(uuid, uuid) from public;
grant execute on function public.fn_complete_daily_quest(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- fn_log_workout — records a workout + its sets in one call, detects
-- personal records, grants workout/PR XP, auto-progresses (and
-- auto-completes) any quest linked to the 'workout' action, and updates
-- the daily streak. Everything happens in a single transaction.
-- ---------------------------------------------------------------------------

create function public.fn_log_workout(
  p_player_id uuid,
  p_sets jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workout_id uuid;
  v_set jsonb;
  v_exercise_id uuid;
  v_reps integer;
  v_weight numeric;
  v_set_number integer;
  v_prior_max numeric;
  v_pr_count integer := 0;
  v_new_prs jsonb := '[]'::jsonb;
  v_quest record;
  v_player public.players;
begin
  if jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) = 0 then
    raise exception 'p_sets must be a non-empty JSON array';
  end if;

  insert into public.workouts (player_id, notes)
  values (p_player_id, p_notes)
  returning id into v_workout_id;

  for v_set in select * from jsonb_array_elements(p_sets)
  loop
    v_exercise_id := (v_set ->> 'exercise_id')::uuid;
    v_set_number := coalesce((v_set ->> 'set_number')::integer, 1);
    v_reps := (v_set ->> 'reps')::integer;
    v_weight := (v_set ->> 'weight_kg')::numeric;

    if v_exercise_id is null or v_reps is null or v_reps <= 0 or v_weight is null or v_weight < 0 then
      raise exception 'invalid workout set payload: %', v_set;
    end if;

    insert into public.workout_sets (workout_id, exercise_id, set_number, reps, weight_kg)
    values (v_workout_id, v_exercise_id, v_set_number, v_reps, v_weight);

    select max(weight_kg) into v_prior_max
      from public.personal_records
      where player_id = p_player_id and exercise_id = v_exercise_id;

    if v_prior_max is null or v_weight > v_prior_max then
      insert into public.personal_records (player_id, exercise_id, weight_kg, reps, workout_id)
      values (p_player_id, v_exercise_id, v_weight, v_reps, v_workout_id);

      v_pr_count := v_pr_count + 1;
      v_new_prs := v_new_prs
        || jsonb_build_object('exercise_id', v_exercise_id, 'weight_kg', v_weight, 'reps', v_reps);
    end if;
  end loop;

  perform public.fn_grant_xp(p_player_id, 500, 'workout', v_workout_id);

  if v_pr_count > 0 then
    perform public.fn_grant_xp(p_player_id, 150 * v_pr_count, 'personal_record', v_workout_id);
  end if;

  perform public.fn_update_streak(p_player_id, current_date);

  for v_quest in
    select id, progress_count, target_count
      from public.quests
      where player_id = p_player_id and status = 'active' and linked_action = 'workout'
      for update
  loop
    update public.quests
      set progress_count = least(v_quest.progress_count + 1, v_quest.target_count)
      where id = v_quest.id;

    if v_quest.progress_count + 1 >= v_quest.target_count then
      perform public.fn_complete_daily_quest(p_player_id, v_quest.id);
    end if;
  end loop;

  select * into v_player from public.players where id = p_player_id;

  return jsonb_build_object(
    'workout_id', v_workout_id,
    'personal_records_count', v_pr_count,
    'new_personal_records', v_new_prs,
    'player', to_jsonb(v_player)
  );
end;
$$;

revoke execute on function public.fn_log_workout(uuid, jsonb, text) from public;
grant execute on function public.fn_log_workout(uuid, jsonb, text) to service_role;

-- ---------------------------------------------------------------------------
-- fn_allocate_stat_point — spends one available stat point on a chosen
-- attribute. Validated server-side (never trust a client-computed stat
-- total): fails if the player has no points left.
-- ---------------------------------------------------------------------------

create function public.fn_allocate_stat_points(
  p_player_id uuid,
  p_stat text,
  p_points integer
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
begin
  if p_points <= 0 then
    raise exception 'points must be positive, got %', p_points;
  end if;

  if p_stat not in ('strength', 'agility', 'endurance', 'vitality', 'intelligence') then
    raise exception 'unknown stat %', p_stat;
  end if;

  select * into v_player from public.players where id = p_player_id for update;
  if not found then
    raise exception 'player % not found', p_player_id;
  end if;

  if v_player.stat_points_available < p_points then
    raise exception
      'player % has % stat points available, cannot spend %', p_player_id, v_player.stat_points_available, p_points;
  end if;

  execute format(
    'update public.players set stat_points_available = stat_points_available - $1, %I = %I + $1 where id = $2',
    p_stat, p_stat
  )
  using p_points, p_player_id;

  select * into v_player from public.players where id = p_player_id;
  return v_player;
end;
$$;

revoke execute on function public.fn_allocate_stat_points(uuid, text, integer) from public;
grant execute on function public.fn_allocate_stat_points(uuid, text, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Seed exercise catalog (small starter set; extend later).
-- ---------------------------------------------------------------------------

insert into public.exercises (name, muscle_groups, equipment) values
  ('Squat', array['quadriceps', 'glutes', 'hamstrings'], 'barbell'),
  ('Bench Press', array['chest', 'triceps', 'front_delts'], 'barbell'),
  ('Deadlift', array['hamstrings', 'glutes', 'back'], 'barbell'),
  ('Overhead Press', array['shoulders', 'triceps'], 'barbell'),
  ('Pull Up', array['back', 'biceps'], 'bodyweight'),
  ('Romanian Deadlift', array['hamstrings', 'glutes'], 'barbell'),
  ('Bulgarian Split Squat', array['quadriceps', 'glutes'], 'dumbbell'),
  ('Leg Press', array['quadriceps', 'glutes'], 'machine'),
  ('Push Up', array['chest', 'triceps', 'front_delts'], 'bodyweight'),
  ('Dumbbell Row', array['back', 'biceps'], 'dumbbell')
on conflict (name) do nothing;
