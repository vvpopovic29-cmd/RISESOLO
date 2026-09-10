-- Wrap auth.uid() as (select auth.uid()) in RLS policies so Postgres
-- evaluates it once per query (initplan) instead of once per row.
-- Also add the two missing covering indexes on personal_records'
-- foreign keys.

drop policy players_select_own on public.players;
create policy players_select_own on public.players
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy xp_transactions_select_own on public.xp_transactions;
create policy xp_transactions_select_own on public.xp_transactions
  for select to authenticated
  using ((select auth.uid()) = player_id);

drop policy reward_transactions_select_own on public.reward_transactions;
create policy reward_transactions_select_own on public.reward_transactions
  for select to authenticated
  using ((select auth.uid()) = player_id);

drop policy quests_select_own on public.quests;
create policy quests_select_own on public.quests
  for select to authenticated
  using ((select auth.uid()) = player_id);

drop policy workouts_select_own on public.workouts;
create policy workouts_select_own on public.workouts
  for select to authenticated
  using ((select auth.uid()) = player_id);

drop policy workout_sets_select_own on public.workout_sets;
create policy workout_sets_select_own on public.workout_sets
  for select to authenticated
  using (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_sets.workout_id
        and w.player_id = (select auth.uid())
    )
  );

drop policy personal_records_select_own on public.personal_records;
create policy personal_records_select_own on public.personal_records
  for select to authenticated
  using ((select auth.uid()) = player_id);

create index personal_records_exercise_id_idx on public.personal_records (exercise_id);
create index personal_records_workout_id_idx on public.personal_records (workout_id);
