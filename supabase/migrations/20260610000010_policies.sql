-- Phase 1: policies. Versioned lifecycle with consultation and review states,
-- acknowledgment requirements scoped to all staff, an org unit or a position,
-- and append-only acknowledgments. Same family lineage pattern as delegation
-- instruments. Supersession is permitted from adopted or under_review: a review
-- concluding a rewrite is needed flows straight into drafting the successor,
-- and the current policy stays in force until the successor is adopted.

create type public.policy_status as enum
  ('draft', 'consultation', 'adopted', 'under_review', 'superseded', 'rescinded', 'archived');
create type public.ack_scope as enum ('all_staff', 'org_unit', 'position');

create table public.policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  family_id uuid not null default gen_random_uuid(),
  title text not null,
  policy_number text,
  category text,
  owner_position_id uuid references public.positions (id),
  status public.policy_status not null default 'draft',
  version int not null default 1,
  supersedes_id uuid references public.policies (id),
  adopted_date date,
  review_cycle_months int check (review_cycle_months is null or review_cycle_months > 0),
  next_review_date date,
  body_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index policies_workspace_idx on public.policies (workspace_id);
create index policies_family_idx on public.policies (family_id);
create index policies_owner_position_idx on public.policies (owner_position_id);
create unique index policies_one_adopted
  on public.policies (family_id) where status in ('adopted', 'under_review');
create unique index policies_one_draft
  on public.policies (family_id) where status in ('draft', 'consultation');

create trigger policies_updated_at
  before update on public.policies
  for each row execute function public.set_updated_at();

create table public.policy_ack_requirements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  policy_id uuid not null references public.policies (id) on delete cascade,
  scope public.ack_scope not null,
  scope_ref uuid,
  created_at timestamptz not null default now(),
  constraint ack_scope_ref_consistent check (
    (scope = 'all_staff' and scope_ref is null)
    or (scope in ('org_unit', 'position') and scope_ref is not null)
  ),
  unique (policy_id, scope, scope_ref)
);

create index policy_ack_requirements_workspace_idx on public.policy_ack_requirements (workspace_id);
create index policy_ack_requirements_policy_idx on public.policy_ack_requirements (policy_id);

create table public.policy_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  requirement_id uuid not null references public.policy_ack_requirements (id),
  user_id uuid not null references auth.users (id),
  policy_version int not null,
  acknowledged_at timestamptz not null default now(),
  unique (requirement_id, user_id)
);

create index policy_acks_workspace_idx on public.policy_acknowledgments (workspace_id);
create index policy_acks_user_idx on public.policy_acknowledgments (user_id);

alter table public.policy_acknowledgments
  add constraint policy_acks_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id);

-- ---------------------------------------------------------------------------
-- State machine and immutability
-- ---------------------------------------------------------------------------

-- Column-by-status matrix:
--   draft, consultation: content editable; lineage columns frozen;
--     transitions draft <-> consultation, either -> adopted or archived
--   adopted: frozen except owner_position_id (administrative transfer),
--     next_review_date; transitions -> under_review, superseded, rescinded
--   under_review: same freeze as adopted; transitions -> adopted (review
--     complete), superseded, rescinded
--   superseded, rescinded, archived: terminal, fully frozen
create or replace function public.enforce_policy_transitions()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  mutable_in_force text[] := array['status', 'owner_position_id', 'next_review_date', 'updated_at'];
  old_rest jsonb := to_jsonb(old) - mutable_in_force;
  new_rest jsonb := to_jsonb(new) - mutable_in_force;
begin
  if old.status in ('superseded', 'rescinded', 'archived') then
    raise exception '% policies are immutable', old.status;
  elsif old.status in ('adopted', 'under_review') then
    if new_rest is distinct from old_rest then
      raise exception 'adopted policy content is immutable: supersede to change it';
    end if;
    if old.status = 'adopted'
       and new.status not in ('adopted', 'under_review', 'superseded', 'rescinded') then
      raise exception 'adopted policies may move to under_review, superseded or rescinded';
    end if;
    if old.status = 'under_review'
       and new.status not in ('under_review', 'adopted', 'superseded', 'rescinded') then
      raise exception 'policies under review may return to adopted or move to superseded or rescinded';
    end if;
  else -- draft or consultation
    if new.status not in ('draft', 'consultation', 'adopted', 'archived') then
      raise exception 'pre-adoption policies may only move between draft, consultation, adopted and archived';
    end if;
    if new.version <> old.version
       or new.supersedes_id is distinct from old.supersedes_id
       or new.family_id <> old.family_id
       or new.workspace_id <> old.workspace_id then
      raise exception 'version, lineage and workspace are fixed at creation';
    end if;
    if new.status = 'adopted' and new.adopted_date is null then
      raise exception 'an adopted policy requires an adopted date';
    end if;
  end if;
  return new;
end;
$$;

create trigger policies_transitions
  before update on public.policies
  for each row execute function public.enforce_policy_transitions();

-- Requirements are editable only while the policy is pre-adoption
create or replace function public.enforce_requirement_mutable()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_status public.policy_status;
  v_policy_id uuid;
begin
  if tg_op = 'DELETE' then
    v_policy_id := old.policy_id;
  else
    v_policy_id := new.policy_id;
  end if;

  select status into v_status
  from public.policies
  where id = v_policy_id;

  if v_status not in ('draft', 'consultation') then
    raise exception 'acknowledgment requirements can only change while the policy is pre-adoption';
  end if;
  if tg_op = 'UPDATE' and new.policy_id <> old.policy_id then
    raise exception 'requirements cannot move between policies';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger policy_ack_requirements_mutable
  before insert or update or delete on public.policy_ack_requirements
  for each row execute function public.enforce_requirement_mutable();

-- Server derives ack workspace, version and timestamp; clients cannot spoof them
create or replace function public.prepare_policy_acknowledgment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_version int;
begin
  select p.workspace_id, p.version into v_workspace_id, v_version
  from public.policy_ack_requirements r
  join public.policies p on p.id = r.policy_id
  where r.id = new.requirement_id;

  if v_workspace_id is null then
    raise exception 'unknown acknowledgment requirement';
  end if;

  new.workspace_id := v_workspace_id;
  new.policy_version := v_version;
  new.acknowledged_at := now();
  new.user_id := coalesce((select auth.uid()), new.user_id);
  return new;
end;
$$;

create trigger policy_acks_prepare
  before insert on public.policy_acknowledgments
  for each row execute function public.prepare_policy_acknowledgment();

create trigger policy_acks_immutable
  before update or delete on public.policy_acknowledgments
  for each row execute function public.block_mutation();

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------

create trigger policies_audit
  after insert or update or delete on public.policies
  for each row execute function public.write_audit();

create trigger policy_ack_requirements_audit
  after insert or update or delete on public.policy_ack_requirements
  for each row execute function public.write_audit();

create trigger policy_acknowledgments_audit
  after insert or update or delete on public.policy_acknowledgments
  for each row execute function public.write_audit();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.policies enable row level security;
alter table public.policy_ack_requirements enable row level security;
alter table public.policy_acknowledgments enable row level security;

create policy policies_select on public.policies
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy policies_insert on public.policies
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy policies_update on public.policies
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]))
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy policy_ack_requirements_select on public.policy_ack_requirements
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy policy_ack_requirements_insert on public.policy_ack_requirements
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy policy_ack_requirements_update on public.policy_ack_requirements
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]))
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy policy_ack_requirements_delete on public.policy_ack_requirements
  for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

-- Acknowledgments: member-wide reads; inserts only by the user themselves,
-- for the current adopted version, when they fall within the requirement's
-- scope. read_only members are not acknowledgment targets.
create policy policy_acks_select on public.policy_acknowledgments
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy policy_acks_insert on public.policy_acknowledgments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.policy_ack_requirements r
      join public.policies p on p.id = r.policy_id
      where r.id = policy_acknowledgments.requirement_id
        and p.status = 'adopted'
        and public.has_workspace_role(p.workspace_id,
              array['admin', 'governance_officer', 'risk_owner', 'manager', 'staff']::public.membership_role[])
        and (
          r.scope = 'all_staff'
          or (r.scope = 'org_unit' and exists (
                select 1
                from public.position_assignments pa
                join public.positions pos on pos.id = pa.position_id
                where pa.user_id = (select auth.uid())
                  and pos.org_unit_id = r.scope_ref
                  and pa.start_date <= public.current_sydney_date()
                  and (pa.end_date is null or pa.end_date >= public.current_sydney_date())
              ))
          or (r.scope = 'position' and exists (
                select 1
                from public.position_assignments pa
                where pa.user_id = (select auth.uid())
                  and pa.position_id = r.scope_ref
                  and pa.start_date <= public.current_sydney_date()
                  and (pa.end_date is null or pa.end_date >= public.current_sydney_date())
              ))
        )
    )
  );
-- No update or delete policies: acknowledgments are append-only evidence.
