-- Phase 0: append-only audit log with generic triggers.
-- Mandatory on all governance records. No updates or deletes, ever.

create table public.audit_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id),
  actor_user_id uuid references auth.users (id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before jsonb,
  after jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_log_workspace_occurred_idx on public.audit_log (workspace_id, occurred_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_actor_idx on public.audit_log (actor_user_id);

-- Hard guarantee of immutability, independent of RLS and grants
create or replace function public.block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only: % not permitted', tg_op;
end;
$$;

create trigger audit_log_immutable
  before update or delete on public.audit_log
  for each row execute function public.block_mutation();

-- Generic audit trigger. Resolves workspace_id from the row, falling back to id
-- for the workspaces table itself. Distinguishes status changes from plain updates.
create or replace function public.write_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_j jsonb;
  new_j jsonb;
  row_j jsonb;
  ws uuid;
  ent uuid;
  act text;
begin
  if tg_op != 'INSERT' then
    old_j := to_jsonb(old);
  end if;
  if tg_op != 'DELETE' then
    new_j := to_jsonb(new);
  end if;
  row_j := coalesce(new_j, old_j);

  ws := coalesce((row_j ->> 'workspace_id')::uuid, (row_j ->> 'id')::uuid);
  ent := (row_j ->> 'id')::uuid;

  if tg_op = 'INSERT' then
    act := 'create';
  elsif tg_op = 'DELETE' then
    act := 'delete';
  elsif (old_j ->> 'status') is distinct from (new_j ->> 'status') then
    act := 'status_change';
  else
    act := 'update';
  end if;

  insert into public.audit_log (workspace_id, actor_user_id, entity_type, entity_id, action, before, after)
  values (ws, (select auth.uid()), tg_table_name, ent, act, old_j, new_j);

  return coalesce(new, old);
end;
$$;

-- Attach to Phase 0 governance-relevant tables
create trigger workspaces_audit
  after insert or update or delete on public.workspaces
  for each row execute function public.write_audit();

create trigger memberships_audit
  after insert or update or delete on public.memberships
  for each row execute function public.write_audit();

create trigger org_units_audit
  after insert or update or delete on public.org_units
  for each row execute function public.write_audit();

create trigger positions_audit
  after insert or update or delete on public.positions
  for each row execute function public.write_audit();

create trigger position_assignments_audit
  after insert or update or delete on public.position_assignments
  for each row execute function public.write_audit();

-- RLS: only admin and governance_officer may read; nobody writes directly.
alter table public.audit_log enable row level security;

create policy audit_log_select on public.audit_log
  for select to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

revoke insert, update, delete on public.audit_log from anon, authenticated;
