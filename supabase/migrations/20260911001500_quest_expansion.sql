-- Faza 5: Quest sistem prosirenje - Weekly/Side questovi + lenja ekspiracija
-- + auto-progres questova povezanih sa ishranom/vodom (ranije je samo
-- fn_log_workout progresovao questove; fn_log_meal/fn_log_water su ostale
-- bez te logike iako `linked_action` sema vec podrzava 'nutrition'/'water').

-- ---------------------------------------------------------------------------
-- fn_expire_stale_quests — oznacava sve aktivne questove igraca cije je
-- expires_at proslo kao 'expired'. Poziva se lenjo (na listQuests i pre
-- svakog generate-a) umesto cron job-a - dovoljno je da se sweep desi pre
-- nego sto se rezultat prikaze/koristi.
-- ---------------------------------------------------------------------------

create function public.fn_expire_stale_quests(p_player_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.quests
    set status = 'expired'
    where player_id = p_player_id
      and status = 'active'
      and expires_at is not null
      and expires_at <= now();
$$;

revoke execute on function public.fn_expire_stale_quests(uuid) from public;
grant execute on function public.fn_expire_stale_quests(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- fn_log_meal / fn_log_water — dodat isti auto-progres pattern kao u
-- fn_log_workout (loop preko aktivnih questova sa odgovarajucim
-- linked_action, +1 progres po pozivu, auto-complete kad progres dostigne cilj).
-- ---------------------------------------------------------------------------

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

  return v_water;
end;
$$;

revoke execute on function public.fn_log_water(uuid, integer) from public;
grant execute on function public.fn_log_water(uuid, integer) to service_role;
