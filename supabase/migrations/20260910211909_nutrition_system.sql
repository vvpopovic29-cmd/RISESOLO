-- Faza 3: Nutrition System - kalorijski/makro ciljevi, obroci, voda,
-- Nutrition XP. Isti bezbednosni model kao gamification core: RLS
-- dozvoljava samo SELECT sopstvenih redova; XP-generisuce mutacije
-- (fn_log_meal, fn_log_water) su SECURITY DEFINER, dostupne iskljucivo
-- service_role.

create table public.nutrition_targets (
  player_id uuid primary key references public.players (id) on delete cascade,
  calorie_target integer check (calorie_target is null or calorie_target > 0),
  protein_target_g integer check (protein_target_g is null or protein_target_g >= 0),
  carb_target_g integer check (carb_target_g is null or carb_target_g >= 0),
  fat_target_g integer check (fat_target_g is null or fat_target_g >= 0),
  water_target_ml integer check (water_target_ml is null or water_target_ml > 0),
  updated_at timestamptz not null default now()
);

create trigger trg_nutrition_targets_set_updated_at
  before update on public.nutrition_targets
  for each row
  execute function public.fn_set_updated_at();

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  name text not null,
  calories integer not null check (calories >= 0),
  protein_g numeric(6, 2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6, 2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6, 2) not null default 0 check (fat_g >= 0),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index meal_logs_player_id_logged_at_idx on public.meal_logs (player_id, logged_at);

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  amount_ml integer not null check (amount_ml > 0),
  logged_at timestamptz not null default now()
);

create index water_logs_player_id_logged_at_idx on public.water_logs (player_id, logged_at);

alter table public.nutrition_targets enable row level security;
alter table public.meal_logs enable row level security;
alter table public.water_logs enable row level security;

create policy nutrition_targets_select_own on public.nutrition_targets
  for select to authenticated
  using ((select auth.uid()) = player_id);

create policy meal_logs_select_own on public.meal_logs
  for select to authenticated
  using ((select auth.uid()) = player_id);

create policy water_logs_select_own on public.water_logs
  for select to authenticated
  using ((select auth.uid()) = player_id);

-- fn_upsert_nutrition_targets: nije XP-osetljivo (samo licni ciljevi koje
-- igrac postavlja sebi), ali i dalje ide kroz service_role radi
-- arhitektonske doslednosti (backend je jedini writer za sve tabele).
create function public.fn_upsert_nutrition_targets(
  p_player_id uuid,
  p_calorie_target integer,
  p_protein_target_g integer,
  p_carb_target_g integer,
  p_fat_target_g integer,
  p_water_target_ml integer
)
returns public.nutrition_targets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_targets public.nutrition_targets;
begin
  insert into public.nutrition_targets (
    player_id, calorie_target, protein_target_g, carb_target_g, fat_target_g, water_target_ml
  )
  values (p_player_id, p_calorie_target, p_protein_target_g, p_carb_target_g, p_fat_target_g, p_water_target_ml)
  on conflict (player_id) do update
    set calorie_target = coalesce(excluded.calorie_target, public.nutrition_targets.calorie_target),
        protein_target_g = coalesce(excluded.protein_target_g, public.nutrition_targets.protein_target_g),
        carb_target_g = coalesce(excluded.carb_target_g, public.nutrition_targets.carb_target_g),
        fat_target_g = coalesce(excluded.fat_target_g, public.nutrition_targets.fat_target_g),
        water_target_ml = coalesce(excluded.water_target_ml, public.nutrition_targets.water_target_ml)
  returning * into v_targets;

  return v_targets;
end;
$$;

revoke execute on function public.fn_upsert_nutrition_targets(uuid, integer, integer, integer, integer, integer) from public;
grant execute on function public.fn_upsert_nutrition_targets(uuid, integer, integer, integer, integer, integer) to service_role;

create function public.fn_log_meal(
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
begin
  insert into public.meal_logs (player_id, name, calories, protein_g, carbs_g, fat_g)
  values (p_player_id, p_name, p_calories, p_protein_g, p_carbs_g, p_fat_g)
  returning * into v_meal;

  perform public.fn_grant_xp(p_player_id, 30, 'meal_log', v_meal.id);

  return v_meal;
end;
$$;

revoke execute on function public.fn_log_meal(uuid, text, integer, numeric, numeric, numeric) from public;
grant execute on function public.fn_log_meal(uuid, text, integer, numeric, numeric, numeric) to service_role;

create function public.fn_log_water(
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
begin
  if p_amount_ml <= 0 then
    raise exception 'amount_ml mora biti pozitivan, dobijeno %', p_amount_ml;
  end if;

  insert into public.water_logs (player_id, amount_ml)
  values (p_player_id, p_amount_ml)
  returning * into v_water;

  perform public.fn_grant_xp(p_player_id, 10, 'water_log', v_water.id);

  return v_water;
end;
$$;

revoke execute on function public.fn_log_water(uuid, integer) from public;
grant execute on function public.fn_log_water(uuid, integer) to service_role;
