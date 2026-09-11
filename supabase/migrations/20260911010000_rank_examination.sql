-- Faza 9: Rank Examination - `players.rank` je do sada bio staticno polje
-- (nikad se nije menjao posle inicijalnog 'E'). Sada napreduje kroz
-- eksplicitan izazov: 'boss' tip questa sa popunjenim `target_rank`
-- (generise ga backend samo kada igrac ispunjava Level uslov za sledeci
-- rank - videti training.RANK_LEVEL_REQUIREMENT), i kada se taj quest
-- zavrsi (dostignut progress_count preko fn_log_workout kao i svaki drugi
-- 'workout'-povezan quest), `fn_complete_daily_quest` promovise rank.

alter table public.quests
  add column target_rank text check (
    target_rank is null or target_rank in ('E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS')
  );

create or replace function public.fn_complete_daily_quest(
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

  if v_quest.type = 'boss' and v_quest.target_rank is not null then
    update public.players set rank = v_quest.target_rank where id = p_player_id;
  end if;

  select * into v_quest from public.quests where id = p_quest_id;
  return v_quest;
end;
$$;

revoke execute on function public.fn_complete_daily_quest(uuid, uuid) from public;
grant execute on function public.fn_complete_daily_quest(uuid, uuid) to service_role;
