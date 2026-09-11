-- Faza 12: Nutrition dnevni cilj bonus XP - do sada je Nutrition XP bio
-- fiksan po logu (30 za obrok, 10 za vodu) bez ikakve nagrade za
-- ispunjavanje CELOG dnevnog cilja (kalorije/makroi/voda istovremeno).
--
-- fn_maybe_grant_nutrition_daily_bonus proverava da li su SVI postavljeni
-- ciljevi igraca ispunjeni za dati datum (kalorije u +/- 10% tolerantnom
-- opsegu, protein/carbs/fat/voda kao minimumi - ista logika je duplirana
-- i testirana u packages/domain/src/nutrition/daily-goal.ts) i ako jesu,
-- idempotentno dodeljuje 100 XP. Poziva se iz fn_log_meal i fn_log_water
-- (svaki log moze da bude taj koji igraca prebaci preko praga za dan).
--
-- nutrition_daily_bonuses tabela je izvor idempotencije (primary key
-- (player_id, bonus_date)) - ne oslanja se na xp_transactions
-- source_ref_id trik jer NULL vrednosti ne sudaraju unique constraint.

create table public.nutrition_daily_bonuses (
  player_id uuid not null references public.players (id) on delete cascade,
  bonus_date date not null,
  granted_at timestamptz not null default now(),
  primary key (player_id, bonus_date)
);

alter table public.nutrition_daily_bonuses enable row level security;

create policy nutrition_daily_bonuses_select_own on public.nutrition_daily_bonuses
  for select to authenticated
  using ((select auth.uid()) = player_id);

create function public.fn_maybe_grant_nutrition_daily_bonus(
  p_player_id uuid,
  p_date date
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_targets public.nutrition_targets;
  v_calories integer;
  v_protein numeric;
  v_carbs numeric;
  v_fat numeric;
  v_water integer;
  v_goal_met boolean;
  v_day_start timestamptz := p_date::timestamptz;
  v_day_end timestamptz := (p_date + 1)::timestamptz;
begin
  select * into v_targets from public.nutrition_targets where player_id = p_player_id;

  if v_targets is null or (
    v_targets.calorie_target is null and v_targets.protein_target_g is null and
    v_targets.carb_target_g is null and v_targets.fat_target_g is null and
    v_targets.water_target_ml is null
  ) then
    return false;
  end if;

  select coalesce(sum(calories), 0), coalesce(sum(protein_g), 0),
         coalesce(sum(carbs_g), 0), coalesce(sum(fat_g), 0)
    into v_calories, v_protein, v_carbs, v_fat
    from public.meal_logs
    where player_id = p_player_id and logged_at >= v_day_start and logged_at < v_day_end;

  select coalesce(sum(amount_ml), 0) into v_water
    from public.water_logs
    where player_id = p_player_id and logged_at >= v_day_start and logged_at < v_day_end;

  v_goal_met :=
    (v_targets.calorie_target is null or
      (v_calories >= v_targets.calorie_target * 0.9 and v_calories <= v_targets.calorie_target * 1.1)) and
    (v_targets.protein_target_g is null or v_protein >= v_targets.protein_target_g) and
    (v_targets.carb_target_g is null or v_carbs >= v_targets.carb_target_g) and
    (v_targets.fat_target_g is null or v_fat >= v_targets.fat_target_g) and
    (v_targets.water_target_ml is null or v_water >= v_targets.water_target_ml);

  if not v_goal_met then
    return false;
  end if;

  insert into public.nutrition_daily_bonuses (player_id, bonus_date)
  values (p_player_id, p_date)
  on conflict (player_id, bonus_date) do nothing;

  if found then
    perform public.fn_grant_xp(p_player_id, 100, 'nutrition_daily_bonus', null);
  end if;

  return true;
end;
$$;

revoke execute on function public.fn_maybe_grant_nutrition_daily_bonus(uuid, date) from public;
grant execute on function public.fn_maybe_grant_nutrition_daily_bonus(uuid, date) to service_role;

-- fn_log_meal / fn_log_water su ranije prosirene (Faza 5) auto-progres
-- petljom preko questova povezanih sa nutrition/water - ta logika se ovde
-- zadrzava nepromenjena, samo se dodaje poziv novog bonus provere na kraju.

create or replace function public.fn_log_meal(
  p_player_id uuid,
  p_name text,
  p_calories integer,
  p_protein_g numeric,
  p_carbs_g numeric,
  p_fat_g numeric
)
returns public.meal_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meal public.meal_logs;
  v_quest record;
begin
  insert into public.meal_logs (player_id, name, calories, protein_g, carbs_g, fat_g)
  values (p_player_id, p_name, p_calories, p_protein_g, p_carbs_g, p_fat_g)
  returning * into v_meal;

  perform public.fn_grant_xp(p_player_id, 30, 'meal_log', v_meal.id);

  for v_quest in
    select id, progress_count, target_count
      from public.quests
      where player_id = p_player_id and status = 'active' and linked_action = 'nutrition'
      for update
  loop
    update public.quests
      set progress_count = least(v_quest.progress_count + 1, v_quest.target_count)
      where id = v_quest.id;

    if v_quest.progress_count + 1 >= v_quest.target_count then
      perform public.fn_complete_daily_quest(p_player_id, v_quest.id);
    end if;
  end loop;

  perform public.fn_maybe_grant_nutrition_daily_bonus(p_player_id, (now() at time zone 'utc')::date);

  return v_meal;
end;
$$;

revoke execute on function public.fn_log_meal(uuid, text, integer, numeric, numeric, numeric) from public;
grant execute on function public.fn_log_meal(uuid, text, integer, numeric, numeric, numeric) to service_role;

create or replace function public.fn_log_water(
  p_player_id uuid,
  p_amount_ml integer
)
returns public.water_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_water public.water_logs;
  v_quest record;
begin
  if p_amount_ml <= 0 then
    raise exception 'amount_ml mora biti pozitivan, dobijeno %', p_amount_ml;
  end if;

  insert into public.water_logs (player_id, amount_ml)
  values (p_player_id, p_amount_ml)
  returning * into v_water;

  perform public.fn_grant_xp(p_player_id, 10, 'water_log', v_water.id);

  for v_quest in
    select id, progress_count, target_count
      from public.quests
      where player_id = p_player_id and status = 'active' and linked_action = 'water'
      for update
  loop
    update public.quests
      set progress_count = least(v_quest.progress_count + 1, v_quest.target_count)
      where id = v_quest.id;

    if v_quest.progress_count + 1 >= v_quest.target_count then
      perform public.fn_complete_daily_quest(p_player_id, v_quest.id);
    end if;
  end loop;

  perform public.fn_maybe_grant_nutrition_daily_bonus(p_player_id, (now() at time zone 'utc')::date);

  return v_water;
end;
$$;

revoke execute on function public.fn_log_water(uuid, integer) from public;
grant execute on function public.fn_log_water(uuid, integer) to service_role;
