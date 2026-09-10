-- fn_handle_new_user still had an implicit PUBLIC EXECUTE grant (the
-- default Postgres applies to every new function) which anon/authenticated
-- inherit regardless of per-role revokes. Trigger invocation never needs
-- any role to hold EXECUTE, so remove it entirely.
revoke execute on function public.fn_handle_new_user() from public;
