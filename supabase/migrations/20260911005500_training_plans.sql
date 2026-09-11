-- Faza 7: Training Plans - nedeljni split (Push/Pull/Legs, Upper/Lower,
-- Full Body) po igracu. `schedule` (7 stavki, ponedeljak..nedelja) se
-- generise na backendu preko `@risesolo/domain` training.generateWeeklySchedule
-- i cuva se kao jsonb radi laksog citanja bez join-a; RPC i dalje validira
-- oblik da nikad ne prihvati necemu drugačiji od 7-elementnog niza.

create table public.training_plans (
  player_id uuid primary key references public.players (id) on delete cascade,
  split_type text not null check (split_type in ('push_pull_legs', 'upper_lower', 'full_body')),
  days_per_week integer not null check (days_per_week between 1 and 7),
  schedule jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger trg_training_plans_set_updated_at
  before update on public.training_plans
  for each row
  execute function public.fn_set_updated_at();

alter table public.training_plans enable row level security;

create policy training_plans_select_own on public.training_plans
  for select to authenticated
  using ((select auth.uid()) = player_id);

-- fn_upsert_training_plan: nije XP-osetljivo (licni raspored koji igrac
-- bira sebi), ali i dalje ide kroz service_role radi arhitektonske
-- doslednosti (backend je jedini writer za sve tabele) - isti obrazac kao
-- fn_upsert_nutrition_targets.
create function public.fn_upsert_training_plan(
  p_player_id uuid,
  p_split_type text,
  p_days_per_week integer,
  p_schedule jsonb
)
returns public.training_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.training_plans;
begin
  if jsonb_typeof(p_schedule) <> 'array' or jsonb_array_length(p_schedule) <> 7 then
    raise exception 'schedule mora biti niz od tacno 7 elemenata (pon..ned)';
  end if;

  insert into public.training_plans (player_id, split_type, days_per_week, schedule)
  values (p_player_id, p_split_type, p_days_per_week, p_schedule)
  on conflict (player_id) do update
    set split_type = excluded.split_type,
        days_per_week = excluded.days_per_week,
        schedule = excluded.schedule
  returning * into v_plan;

  return v_plan;
end;
$$;

revoke execute on function public.fn_upsert_training_plan(uuid, text, integer, jsonb) from public;
grant execute on function public.fn_upsert_training_plan(uuid, text, integer, jsonb) to service_role;
