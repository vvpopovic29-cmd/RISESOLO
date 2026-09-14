-- Standardne Supabase RLS/performance ispravke, primenjene odmah (umesto
-- da cekaju Fazu 12 dok baza jos nema pravih podataka/saobracaja):
--   1) auth.uid() -> (select auth.uid()) u svim policy-jima (query planner
--      ga tada evaluira jednom po upitu, ne po redu).
--   2) Indeksi na sve FK kolone koje su ih pominjale u advisors nalazu.
--   3) "for all" policy-ji na *_write tabelama su preklapali select sa
--      posebnim select policy-jem (multiple_permissive_policies) - podeljeno
--      na insert/update/delete koji vise ne pokrivaju select.

-- --- indeksi na FK kolone -----------------------------------------------
create index idx_workout_session_exercises_exercise_id on public.workout_session_exercises (exercise_id);
create index idx_workout_sessions_workout_template_id on public.workout_sessions (workout_template_id);
create index idx_workout_template_exercises_exercise_id on public.workout_template_exercises (exercise_id);
create index idx_workout_templates_user_id on public.workout_templates (user_id);

-- --- profiles -------------------------------------------------------------
drop policy profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- --- player_stats -----------------------------------------------------
drop policy player_stats_select_own on public.player_stats;
create policy player_stats_select_own on public.player_stats
  for select to authenticated
  using (user_id = (select auth.uid()));

-- --- progression --------------------------------------------------------
drop policy progression_select_own on public.progression;
create policy progression_select_own on public.progression
  for select to authenticated
  using (user_id = (select auth.uid()));

-- --- xp_events ------------------------------------------------------------
drop policy xp_events_select_own on public.xp_events;
create policy xp_events_select_own on public.xp_events
  for select to authenticated
  using (user_id = (select auth.uid()));

-- --- quests -----------------------------------------------------------
drop policy quests_select_own on public.quests;
create policy quests_select_own on public.quests
  for select to authenticated
  using (user_id = (select auth.uid()));

-- --- workout_templates --------------------------------------------------
drop policy workout_templates_select on public.workout_templates;
create policy workout_templates_select on public.workout_templates
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

drop policy workout_templates_insert_own on public.workout_templates;
create policy workout_templates_insert_own on public.workout_templates
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy workout_templates_update_own on public.workout_templates;
create policy workout_templates_update_own on public.workout_templates
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy workout_templates_delete_own on public.workout_templates;
create policy workout_templates_delete_own on public.workout_templates
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- --- workout_template_exercises (split "for all" iz select) -----------
drop policy workout_template_exercises_select on public.workout_template_exercises;
create policy workout_template_exercises_select on public.workout_template_exercises
  for select to authenticated
  using (
    exists (
      select 1 from public.workout_templates wt
      where wt.id = template_id and (wt.user_id is null or wt.user_id = (select auth.uid()))
    )
  );

drop policy workout_template_exercises_write_own on public.workout_template_exercises;
create policy workout_template_exercises_insert_own on public.workout_template_exercises
  for insert to authenticated
  with check (
    exists (select 1 from public.workout_templates wt where wt.id = template_id and wt.user_id = (select auth.uid()))
  );
create policy workout_template_exercises_update_own on public.workout_template_exercises
  for update to authenticated
  using (
    exists (select 1 from public.workout_templates wt where wt.id = template_id and wt.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.workout_templates wt where wt.id = template_id and wt.user_id = (select auth.uid()))
  );
create policy workout_template_exercises_delete_own on public.workout_template_exercises
  for delete to authenticated
  using (
    exists (select 1 from public.workout_templates wt where wt.id = template_id and wt.user_id = (select auth.uid()))
  );

-- --- workout_sessions ---------------------------------------------------
drop policy workout_sessions_select_own on public.workout_sessions;
create policy workout_sessions_select_own on public.workout_sessions
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy workout_sessions_insert_own on public.workout_sessions;
create policy workout_sessions_insert_own on public.workout_sessions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status <> 'COMPLETED');

drop policy workout_sessions_update_own_not_completed on public.workout_sessions;
create policy workout_sessions_update_own_not_completed on public.workout_sessions
  for update to authenticated
  using (user_id = (select auth.uid()) and status <> 'COMPLETED')
  with check (user_id = (select auth.uid()) and status <> 'COMPLETED');

-- --- workout_session_exercises (split "for all" iz select) ------------
drop policy workout_session_exercises_select on public.workout_session_exercises;
create policy workout_session_exercises_select on public.workout_session_exercises
  for select to authenticated
  using (
    exists (select 1 from public.workout_sessions ws where ws.id = session_id and ws.user_id = (select auth.uid()))
  );

drop policy workout_session_exercises_write on public.workout_session_exercises;
create policy workout_session_exercises_insert on public.workout_session_exercises
  for insert to authenticated
  with check (
    exists (select 1 from public.workout_sessions ws where ws.id = session_id and ws.user_id = (select auth.uid()) and ws.status = 'IN_PROGRESS')
  );
create policy workout_session_exercises_update on public.workout_session_exercises
  for update to authenticated
  using (
    exists (select 1 from public.workout_sessions ws where ws.id = session_id and ws.user_id = (select auth.uid()) and ws.status = 'IN_PROGRESS')
  )
  with check (
    exists (select 1 from public.workout_sessions ws where ws.id = session_id and ws.user_id = (select auth.uid()) and ws.status = 'IN_PROGRESS')
  );
create policy workout_session_exercises_delete on public.workout_session_exercises
  for delete to authenticated
  using (
    exists (select 1 from public.workout_sessions ws where ws.id = session_id and ws.user_id = (select auth.uid()) and ws.status = 'IN_PROGRESS')
  );

-- --- workout_sets (split "for all" iz select) --------------------------
drop policy workout_sets_select on public.workout_sets;
create policy workout_sets_select on public.workout_sets
  for select to authenticated
  using (
    exists (
      select 1 from public.workout_session_exercises wse
      join public.workout_sessions ws on ws.id = wse.session_id
      where wse.id = session_exercise_id and ws.user_id = (select auth.uid())
    )
  );

drop policy workout_sets_write on public.workout_sets;
create policy workout_sets_insert on public.workout_sets
  for insert to authenticated
  with check (
    exists (
      select 1 from public.workout_session_exercises wse
      join public.workout_sessions ws on ws.id = wse.session_id
      where wse.id = session_exercise_id and ws.user_id = (select auth.uid()) and ws.status = 'IN_PROGRESS'
    )
  );
create policy workout_sets_update on public.workout_sets
  for update to authenticated
  using (
    exists (
      select 1 from public.workout_session_exercises wse
      join public.workout_sessions ws on ws.id = wse.session_id
      where wse.id = session_exercise_id and ws.user_id = (select auth.uid()) and ws.status = 'IN_PROGRESS'
    )
  )
  with check (
    exists (
      select 1 from public.workout_session_exercises wse
      join public.workout_sessions ws on ws.id = wse.session_id
      where wse.id = session_exercise_id and ws.user_id = (select auth.uid()) and ws.status = 'IN_PROGRESS'
    )
  );
create policy workout_sets_delete on public.workout_sets
  for delete to authenticated
  using (
    exists (
      select 1 from public.workout_session_exercises wse
      join public.workout_sessions ws on ws.id = wse.session_id
      where wse.id = session_exercise_id and ws.user_id = (select auth.uid()) and ws.status = 'IN_PROGRESS'
    )
  );
