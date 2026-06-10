-- Phase 0: function hardening per Supabase security advisors.
-- Pin search_path on trigger functions and remove RPC access to functions
-- that are only ever invoked by triggers or RLS policies.

alter function public.set_updated_at() set search_path = public;
alter function public.block_mutation() set search_path = public;

-- Trigger functions: Postgres does not check EXECUTE at fire time,
-- so revoking blocks the /rest/v1/rpc surface without breaking triggers.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.write_audit() from public, anon, authenticated;

-- RLS helpers: policies are `to authenticated`, which must keep EXECUTE.
-- anon never passes those policies so it has no reason to call these.
revoke execute on function public.is_workspace_member(uuid) from public, anon;
revoke execute on function public.has_workspace_role(uuid, public.membership_role[]) from public, anon;
revoke execute on function public.shares_workspace_with(uuid) from public, anon;
