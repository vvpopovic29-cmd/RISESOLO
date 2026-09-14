-- Faza 5 (Workout) - WorkoutTemplate/WorkoutSession/WorkoutSet, tacno
-- prati packages/domain/src/workouts/workout.types.ts.
--
-- RLS dizajn za workout_sessions: korisnik SME da menja svoju sesiju (i
-- da loguje setove) dok je IN_PROGRESS/ABANDONED, ali NE SME nikad sam
-- da postavi status='COMPLETED' (WITH CHECK to blokira) - taj prelaz
-- radi SAMO service_role (Completion Engine, Faza 6), koji tada iz
-- stvarno upisanih setova racuna XP (ne veruje klijentu). Kad je session
-- COMPLETED, USING klauzula ga zakljucava od daljih izmena od strane
-- vlasnika.

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references public.profiles (id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);
comment on table public.workout_templates is 'user_id NULL = sistemski/default template (svima vidljiv), inace privatan template vlasnika.';

alter table public.workout_templates enable row level security;

create policy workout_templates_select on public.workout_templates
  for select to authenticated
  using (user_id is null or user_id = auth.uid());

create policy workout_templates_insert_own on public.workout_templates
  for insert to authenticated
  with check (user_id = auth.uid());

create policy workout_templates_update_own on public.workout_templates
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy workout_templates_delete_own on public.workout_templates
  for delete to authenticated
  using (user_id = auth.uid());

create table public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  exercise_id text not null references public.exercises (id),
  order_index integer not null check (order_index > 0),
  target_sets integer not null check (target_sets > 0),
  target_reps text null,
  target_duration_seconds integer null,
  rest_seconds integer not null default 60,
  unique (template_id, order_index)
);

alter table public.workout_template_exercises enable row level security;

create policy workout_template_exercises_select on public.workout_template_exercises
  for select to authenticated
  using (
    exists (
      select 1 from public.workout_templates wt
      where wt.id = template_id and (wt.user_id is null or wt.user_id = auth.uid())
    )
  );

create policy workout_template_exercises_write_own on public.workout_template_exercises
  for all to authenticated
  using (
    exists (
      select 1 from public.workout_templates wt
      where wt.id = template_id and wt.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_templates wt
      where wt.id = template_id and wt.user_id = auth.uid()
    )
  );

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workout_template_id uuid null references public.workout_templates (id) on delete set null,
  status text not null default 'IN_PROGRESS'
    check (status in ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
  started_at timestamptz not null default now(),
  completed_at timestamptz null
);
comment on table public.workout_sessions is 'status -> COMPLETED je SAMO service_role prelaz (RLS WITH CHECK blokira klijenta) - Completion Engine (Faza 6) racuna XP tek tada, iz stvarno upisanih workout_sets.';

alter table public.workout_sessions enable row level security;

create policy workout_sessions_select_own on public.workout_sessions
  for select to authenticated
  using (user_id = auth.uid());

create policy workout_sessions_insert_own on public.workout_sessions
  for insert to authenticated
  with check (user_id = auth.uid() and status <> 'COMPLETED');

create policy workout_sessions_update_own_not_completed on public.workout_sessions
  for update to authenticated
  using (user_id = auth.uid() and status <> 'COMPLETED')
  with check (user_id = auth.uid() and status <> 'COMPLETED');

create index idx_workout_sessions_user_id on public.workout_sessions (user_id, started_at desc);

create table public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id text not null references public.exercises (id),
  order_index integer not null check (order_index > 0),
  unique (session_id, order_index)
);

alter table public.workout_session_exercises enable row level security;

create policy workout_session_exercises_select on public.workout_session_exercises
  for select to authenticated
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  );

create policy workout_session_exercises_write on public.workout_session_exercises
  for all to authenticated
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid() and ws.status = 'IN_PROGRESS'
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid() and ws.status = 'IN_PROGRESS'
    )
  );

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.workout_session_exercises (id) on delete cascade,
  set_number integer not null check (set_number > 0),
  reps integer null check (reps is null or reps >= 0),
  weight numeric null check (weight is null or weight >= 0),
  duration_seconds integer null check (duration_seconds is null or duration_seconds >= 0),
  assistance text null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_exercise_id, set_number)
);
comment on table public.workout_sets is 'Jedan oblik za calisthenics (reps/duration_seconds/assistance) i gym (weight/reps) - neiskorisceno polje ostaje null (Faza 5).';

alter table public.workout_sets enable row level security;

create policy workout_sets_select on public.workout_sets
  for select to authenticated
  using (
    exists (
      select 1 from public.workout_session_exercises wse
      join public.workout_sessions ws on ws.id = wse.session_id
      where wse.id = session_exercise_id and ws.user_id = auth.uid()
    )
  );

create policy workout_sets_write on public.workout_sets
  for all to authenticated
  using (
    exists (
      select 1 from public.workout_session_exercises wse
      join public.workout_sessions ws on ws.id = wse.session_id
      where wse.id = session_exercise_id and ws.user_id = auth.uid() and ws.status = 'IN_PROGRESS'
    )
  )
  with check (
    exists (
      select 1 from public.workout_session_exercises wse
      join public.workout_sessions ws on ws.id = wse.session_id
      where wse.id = session_exercise_id and ws.user_id = auth.uid() and ws.status = 'IN_PROGRESS'
    )
  );
