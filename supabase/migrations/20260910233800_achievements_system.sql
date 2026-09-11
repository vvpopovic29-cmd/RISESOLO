-- Faza 4: Achievements / Titles sistem.
--
-- `achievements` je javni katalog (kao `exercises`) - svi autentifikovani
-- korisnici ga citaju. `player_achievements` belezi otkljucane naslove po
-- igracu. Otkljucavanje ide iskljucivo kroz `fn_evaluate_achievements`
-- (SECURITY DEFINER, service_role) koja proverava trenutne pragove i
-- dodeljuje XP/coins preko vec postojecih `fn_grant_xp`/`fn_grant_reward` -
-- isti bezbednosni model kao ostatak gamification jezgra (nikad direktan
-- klijentski upis u XP/coins).

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  category text not null check (category in ('training', 'consistency', 'nutrition', 'progression')),
  -- Tumaci se u fn_evaluate_achievements: bira se odgovarajuca trenutna
  -- vrednost (broj treninga, najduzi streak, itd.) i poredi sa requirement_value.
  requirement_type text not null check (
    requirement_type in (
      'workout_count',
      'personal_record_count',
      'longest_streak',
      'level',
      'meal_log_count',
      'water_log_count',
      'quest_completed_count'
    )
  ),
  requirement_value integer not null check (requirement_value > 0),
  xp_reward integer not null default 0 check (xp_reward >= 0),
  coin_reward integer not null default 0 check (coin_reward >= 0),
  sort_order integer not null default 0
);

create table public.player_achievements (
  player_id uuid not null references public.players (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (player_id, achievement_id)
);

create index player_achievements_player_id_idx on public.player_achievements (player_id);

alter table public.achievements enable row level security;
alter table public.player_achievements enable row level security;

create policy achievements_select_all on public.achievements
  for select to authenticated, anon
  using (true);

create policy player_achievements_select_own on public.player_achievements
  for select to authenticated
  using ((select auth.uid()) = player_id);

-- ---------------------------------------------------------------------------
-- fn_evaluate_achievements — proverava sve jos-neotkljucane achievement-e za
-- igraca protiv njegovog trenutnog stanja i broja aktivnosti, otkljucava sve
-- cije su pragovi dostignuti, dodeljuje XP/coins i vraca listu novootkljucanih
-- (setof achievements). Idempotentna je: fn_grant_xp/fn_grant_reward vec imaju
-- (player_id, source, source_ref_id) unique guard, pa ponovljen poziv (ili
-- konkurentna trka oko `on conflict do nothing` na player_achievements) nikad
-- ne dodeljuje XP/coins dvaput za isti achievement.
-- ---------------------------------------------------------------------------

create function public.fn_evaluate_achievements(p_player_id uuid)
returns setof public.achievements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
  v_achievement record;
  v_current_value integer;
  v_unlocked_ids uuid[] := '{}';
begin
  select * into v_player from public.players where id = p_player_id;
  if not found then
    raise exception 'player % not found', p_player_id;
  end if;

  for v_achievement in
    select a.*
      from public.achievements a
      where not exists (
        select 1 from public.player_achievements pa
        where pa.player_id = p_player_id and pa.achievement_id = a.id
      )
      order by a.sort_order
  loop
    v_current_value := case v_achievement.requirement_type
      when 'level' then v_player.level
      when 'longest_streak' then v_player.longest_streak
      when 'workout_count' then
        (select count(*)::integer from public.workouts where player_id = p_player_id)
      when 'personal_record_count' then
        (select count(*)::integer from public.personal_records where player_id = p_player_id)
      when 'meal_log_count' then
        (select count(*)::integer from public.meal_logs where player_id = p_player_id)
      when 'water_log_count' then
        (select count(*)::integer from public.water_logs where player_id = p_player_id)
      when 'quest_completed_count' then
        (select count(*)::integer from public.quests where player_id = p_player_id and status = 'completed')
      else 0
    end;

    if v_current_value >= v_achievement.requirement_value then
      insert into public.player_achievements (player_id, achievement_id)
      values (p_player_id, v_achievement.id)
      on conflict do nothing;

      if v_achievement.xp_reward > 0 then
        perform public.fn_grant_xp(p_player_id, v_achievement.xp_reward, 'achievement', v_achievement.id);
      end if;

      if v_achievement.coin_reward > 0 then
        perform public.fn_grant_reward(p_player_id, v_achievement.coin_reward, 0, 'achievement', v_achievement.id);
      end if;

      v_unlocked_ids := v_unlocked_ids || v_achievement.id;
    end if;
  end loop;

  if array_length(v_unlocked_ids, 1) is null then
    return;
  end if;

  return query
    select * from public.achievements where id = any (v_unlocked_ids) order by sort_order;
end;
$$;

revoke execute on function public.fn_evaluate_achievements(uuid) from public;
grant execute on function public.fn_evaluate_achievements(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Seed katalog (Solo Leveling-inspirisani naslovi).
-- ---------------------------------------------------------------------------

insert into public.achievements
  (code, title, description, category, requirement_type, requirement_value, xp_reward, coin_reward, sort_order)
values
  ('first_workout', 'Prvi korak', 'Zabelezi svoj prvi trening.', 'training', 'workout_count', 1, 50, 10, 10),
  ('workout_10', 'Posvecenost', 'Zabelezi 10 treninga.', 'training', 'workout_count', 10, 200, 50, 11),
  ('workout_50', 'Gvozdena volja', 'Zabelezi 50 treninga.', 'training', 'workout_count', 50, 500, 150, 12),
  ('first_pr', 'Novi rekord', 'Postavi svoj prvi licni rekord.', 'training', 'personal_record_count', 1, 100, 20, 20),
  ('pr_10', 'Lovac na rekorde', 'Postavi 10 licnih rekorda.', 'training', 'personal_record_count', 10, 300, 75, 21),
  ('streak_3', 'Zagrevanje', 'Dostigni streak od 3 dana.', 'consistency', 'longest_streak', 3, 100, 25, 30),
  ('streak_7', 'Nedelja discipline', 'Dostigni streak od 7 dana.', 'consistency', 'longest_streak', 7, 250, 60, 31),
  ('streak_30', 'Gvozdena disciplina', 'Dostigni streak od 30 dana.', 'consistency', 'longest_streak', 30, 1000, 250, 32),
  ('first_meal', 'Prvi obrok', 'Zabelezi svoj prvi obrok.', 'nutrition', 'meal_log_count', 1, 30, 5, 40),
  ('meal_25', 'Nutricionista', 'Zabelezi 25 obroka.', 'nutrition', 'meal_log_count', 25, 200, 50, 41),
  ('first_water', 'Hidratacija', 'Zabelezi svoj prvi unos vode.', 'nutrition', 'water_log_count', 1, 20, 5, 42),
  ('water_50', 'Izvor zivota', 'Zabelezi 50 unosa vode.', 'nutrition', 'water_log_count', 50, 200, 50, 43),
  ('level_5', 'Napredni Hunter', 'Dostigni Level 5.', 'progression', 'level', 5, 0, 100, 50),
  ('level_10', 'Elitni Hunter', 'Dostigni Level 10.', 'progression', 'level', 10, 0, 250, 51),
  ('level_20', 'Legenda', 'Dostigni Level 20.', 'progression', 'level', 20, 0, 500, 52),
  ('quest_10', 'Lovac na questove', 'Zavrsi 10 questova.', 'progression', 'quest_completed_count', 10, 200, 50, 60),
  ('quest_50', 'Majstor questova', 'Zavrsi 50 questova.', 'progression', 'quest_completed_count', 50, 500, 150, 61)
on conflict (code) do nothing;
