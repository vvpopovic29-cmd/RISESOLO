-- Supabase auto-grants EXECUTE on new public-schema functions to
-- anon/authenticated via default privileges — this happens independently
-- of `REVOKE ... FROM PUBLIC`, so the previous migration's revoke did not
-- actually block direct client calls. Close that gap explicitly for every
-- SECURITY DEFINER function that mutates player state.

revoke execute on function public.fn_grant_xp(uuid, integer, text, uuid) from anon, authenticated;
revoke execute on function public.fn_grant_reward(uuid, integer, integer, text, uuid) from anon, authenticated;
revoke execute on function public.fn_update_streak(uuid, date) from anon, authenticated;
revoke execute on function public.fn_complete_daily_quest(uuid, uuid) from anon, authenticated;
revoke execute on function public.fn_log_workout(uuid, jsonb, text) from anon, authenticated;
revoke execute on function public.fn_allocate_stat_points(uuid, text, integer) from anon, authenticated;

-- fn_handle_new_user is only ever invoked by the on_auth_user_created
-- trigger (which runs as the function owner regardless of grants) — no
-- role needs direct EXECUTE on it.
revoke execute on function public.fn_handle_new_user() from anon, authenticated;

-- Also fix the mutable search_path warning on the updated_at trigger
-- function (a plpgsql function without a pinned search_path can be
-- tricked by a role that can create objects earlier in the resolved
-- search_path; pin it even though this function only touches NEW/OLD).
alter function public.fn_set_updated_at() set search_path = public;

-- Make sure future functions in this schema don't silently regain public
-- access: new functions no longer default-grant EXECUTE to anon/authenticated.
alter default privileges in schema public revoke execute on functions from anon, authenticated;
