-- Uklanja prototip semu (players/xp_transactions/quests/exercises/workouts/
-- nutrition/achievements/training_plans, sa svim pratecim funkcijama i
-- trigerima) da bi ustupila mesto Faza 1-6 MVP dizajnu. Nema pravih
-- korisnickih podataka u riziku (players: 0 redova) - exercises/
-- exercise_alternatives/achievements su bili samo seed/referentni sadrzaj.

-- 1) Trigger na auth.users mora ici pre funkcije koju poziva.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.fn_handle_new_user();

-- 2) Tabele (CASCADE ciste table-level trigere, FK, indekse).
drop table if exists public.nutrition_daily_bonuses cascade;
drop table if exists public.water_logs cascade;
drop table if exists public.meal_logs cascade;
drop table if exists public.nutrition_targets cascade;
drop table if exists public.training_plans cascade;
drop table if exists public.player_achievements cascade;
drop table if exists public.achievements cascade;
drop table if exists public.personal_records cascade;
drop table if exists public.exercise_alternatives cascade;
drop table if exists public.workout_sets cascade;
drop table if exists public.workouts cascade;
drop table if exists public.quests cascade;
drop table if exists public.reward_transactions cascade;
drop table if exists public.xp_transactions cascade;
drop table if exists public.exercises cascade;
drop table if exists public.players cascade;

-- 3) Preostale poslovne funkcije (fn_set_updated_at se ponovo pravi u
--    sledecoj migraciji sa CREATE OR REPLACE, pa je ovde takodje brisemo
--    radi cistog starta).
drop function if exists public.fn_allocate_stat_points(uuid, text, integer);
drop function if exists public.fn_complete_daily_quest(uuid, uuid);
drop function if exists public.fn_evaluate_achievements(uuid);
drop function if exists public.fn_expire_stale_quests(uuid);
drop function if exists public.fn_grant_reward(uuid, integer, integer, text, uuid);
drop function if exists public.fn_grant_xp(uuid, integer, text, uuid);
drop function if exists public.fn_log_meal(uuid, text, integer, numeric, numeric, numeric);
drop function if exists public.fn_log_water(uuid, integer);
drop function if exists public.fn_log_workout(uuid, jsonb, text);
drop function if exists public.fn_maybe_grant_nutrition_daily_bonus(uuid, date);
drop function if exists public.fn_update_streak(uuid, date);
drop function if exists public.fn_upsert_nutrition_targets(uuid, integer, integer, integer, integer, integer);
drop function if exists public.fn_upsert_training_plan(uuid, text, integer, jsonb);
drop function if exists public.fn_set_updated_at();
