-- Phase 1: delegations. Versioned instruments with a family lineage, delegations
-- of functions with legislative provision links, assignments to positions, and
-- append-only acknowledgments keyed to the occupancy so re-acknowledgement on
-- occupant change or version change is structural, not computed.

create type public.delegation_instrument_type as enum ('council_to_gm', 'gm_to_staff');
create type public.delegation_instrument_status as enum ('draft', 'adopted', 'superseded', 'archived');
create type public.delegation_assignment_status as enum ('active', 'revoked');

-- Dates are stored UTC; "current" is a Sydney concept.
create or replace function public.current_sydney_date()
returns date
language sql
stable
set search_path = public
as $$
  select (now() at time zone 'Australia/Sydney')::date;
$$;

-- Instruments
create table public.delegation_instruments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  family_id uuid not null default gen_random_uuid(),
  title text not null,
  instrument_type public.delegation_instrument_type not null,
  status public.delegation_instrument_status not null default 'draft',
  version int not null default 1,
  supersedes_id uuid references public.delegation_instruments (id),
  adopted_date date,
  resolution_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index delegation_instruments_workspace_idx on public.delegation_instruments (workspace_id);
create index delegation_instruments_family_idx on public.delegation_instruments (family_id);
-- Lineage invariants as constraints, not application discipline
create unique index delegation_instruments_one_adopted
  on public.delegation_instruments (family_id) where status = 'adopted';
create unique index delegation_instruments_one_draft
  on public.delegation_instruments (family_id) where status = 'draft';

create trigger delegation_instruments_updated_at
  before update on public.delegation_instruments
  for each row execute function public.set_updated_at();

-- Delegated functions within an instrument
create table public.delegations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  delegation_instrument_id uuid not null references public.delegation_instruments (id) on delete cascade,
  function_title text not null,
  function_description text,
  conditions_limitations text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index delegations_workspace_idx on public.delegations (workspace_id);
create index delegations_instrument_idx on public.delegations (delegation_instrument_id);

create trigger delegations_updated_at
  before update on public.delegations
  for each row execute function public.set_updated_at();

-- Provision links (m2m). Surrogate id kept so write_audit() has an entity_id.
create table public.delegation_provisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  delegation_id uuid not null references public.delegations (id) on delete cascade,
  provision_id uuid not null references public.legislative_provisions (id),
  created_at timestamptz not null default now(),
  unique (delegation_id, provision_id)
);

create index delegation_provisions_workspace_idx on public.delegation_provisions (workspace_id);
create index delegation_provisions_provision_idx on public.delegation_provisions (provision_id);

-- Assignment of a delegation to a position
create table public.delegation_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  delegation_id uuid not null references public.delegations (id) on delete cascade,
  position_id uuid not null references public.positions (id),
  effective_from date not null default current_date,
  effective_to date,
  status public.delegation_assignment_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delegation_assignment_dates_valid
    check (effective_to is null or effective_to >= effective_from)
);

create index delegation_assignments_workspace_idx on public.delegation_assignments (workspace_id);
create index delegation_assignments_delegation_idx on public.delegation_assignments (delegation_id);
create index delegation_assignments_position_idx on public.delegation_assignments (position_id);
create unique index delegation_assignments_no_dupes
  on public.delegation_assignments (delegation_id, position_id) where status = 'active';

create trigger delegation_assignments_updated_at
  before update on public.delegation_assignments
  for each row execute function public.set_updated_at();

-- Acknowledgments: append-only evidence, one per (delegation assignment, occupancy)
create table public.delegation_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  delegation_assignment_id uuid not null references public.delegation_assignments (id),
  position_assignment_id uuid not null references public.position_assignments (id),
  user_id uuid not null references auth.users (id),
  instrument_version int not null,
  acknowledged_at timestamptz not null default now(),
  unique (delegation_assignment_id, position_assignment_id)
);

create index delegation_acks_workspace_idx on public.delegation_acknowledgments (workspace_id);
create index delegation_acks_user_idx on public.delegation_acknowledgments (user_id);
create index delegation_acks_position_assignment_idx on public.delegation_acknowledgments (position_assignment_id);

alter table public.delegation_acknowledgments
  add constraint delegation_acks_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id);

-- ---------------------------------------------------------------------------
-- State machine and immutability enforcement
-- ---------------------------------------------------------------------------

-- Column-by-status matrix:
--   draft:      title, adopted_date, resolution_reference editable;
--               version, supersedes_id, family_id, workspace_id, instrument_type frozen;
--               status -> adopted (needs adopted_date; council_to_gm also needs
--               resolution_reference) or -> archived
--   adopted:    everything frozen; status -> superseded only
--   superseded, archived: terminal, fully frozen
create or replace function public.enforce_instrument_transitions()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  old_rest jsonb := to_jsonb(old) - 'status' - 'updated_at';
  new_rest jsonb := to_jsonb(new) - 'status' - 'updated_at';
begin
  if old.status = 'adopted' then
    if new.status = 'adopted' then
      raise exception 'adopted instruments are immutable: supersede to change content';
    elsif new.status = 'superseded' then
      if new_rest is distinct from old_rest then
        raise exception 'only status may change when superseding an instrument';
      end if;
    else
      raise exception 'adopted instruments may only transition to superseded';
    end if;
  elsif old.status in ('superseded', 'archived') then
    raise exception '% instruments are immutable', old.status;
  else -- draft
    if new.status not in ('draft', 'adopted', 'archived') then
      raise exception 'drafts may only be adopted or archived';
    end if;
    if new.version <> old.version
       or new.supersedes_id is distinct from old.supersedes_id
       or new.family_id <> old.family_id
       or new.workspace_id <> old.workspace_id
       or new.instrument_type <> old.instrument_type then
      raise exception 'version, lineage, workspace and type are fixed at creation';
    end if;
    if new.status = 'adopted' then
      if new.adopted_date is null then
        raise exception 'an adopted instrument requires an adopted date';
      end if;
      if new.instrument_type = 'council_to_gm' and new.resolution_reference is null then
        raise exception 'a council instrument requires a resolution reference';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger delegation_instruments_transitions
  before update on public.delegation_instruments
  for each row execute function public.enforce_instrument_transitions();

-- Delegations and provision links are editable only while the instrument is draft
create or replace function public.enforce_delegation_mutable()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_delegation_instrument_id uuid;
  v_status public.delegation_instrument_status;
  v_row record;
begin
  if tg_op = 'DELETE' then
    v_row := old;
  else
    v_row := new;
  end if;

  if tg_table_name = 'delegations' then
    v_delegation_instrument_id := v_row.delegation_instrument_id;
    if tg_op = 'UPDATE' and new.delegation_instrument_id <> old.delegation_instrument_id then
      raise exception 'delegations cannot move between instruments';
    end if;
  else -- delegation_provisions
    select d.delegation_instrument_id into v_delegation_instrument_id
    from public.delegations d
    where d.id = v_row.delegation_id;
  end if;

  select status into v_status
  from public.delegation_instruments
  where id = v_delegation_instrument_id;

  if v_status <> 'draft' then
    raise exception 'delegation content can only change while the instrument is a draft';
  end if;
  return v_row;
end;
$$;

create trigger delegations_mutable
  before insert or update or delete on public.delegations
  for each row execute function public.enforce_delegation_mutable();

create trigger delegation_provisions_mutable
  before insert or update or delete on public.delegation_provisions
  for each row execute function public.enforce_delegation_mutable();

-- Assignments: free while draft; under an adopted instrument only revocation
-- (status -> revoked plus effective_to) is allowed, so a GM can revoke without
-- re-issuing the whole instrument. Adding positions requires a new version.
create or replace function public.enforce_assignment_mutable()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_status public.delegation_instrument_status;
  old_rest jsonb;
  new_rest jsonb;
  v_delegation_id uuid;
begin
  if tg_op = 'DELETE' then
    v_delegation_id := old.delegation_id;
  else
    v_delegation_id := new.delegation_id;
  end if;

  select di.status into v_status
  from public.delegations d
  join public.delegation_instruments di on di.id = d.delegation_instrument_id
  where d.id = v_delegation_id;

  if v_status = 'draft' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and v_status = 'adopted' then
    old_rest := to_jsonb(old) - 'status' - 'effective_to' - 'updated_at';
    new_rest := to_jsonb(new) - 'status' - 'effective_to' - 'updated_at';
    if new_rest is distinct from old_rest then
      raise exception 'under an adopted instrument only revocation may change an assignment';
    end if;
    if new.status = 'active' and old.status = 'revoked' then
      raise exception 'revoked assignments cannot be reinstated: issue a new version';
    end if;
    return new;
  end if;

  raise exception 'assignments can only be added or removed while the instrument is a draft';
end;
$$;

create trigger delegation_assignments_mutable
  before insert or update or delete on public.delegation_assignments
  for each row execute function public.enforce_assignment_mutable();

-- Acknowledgments: server derives everything except which assignment is being
-- acknowledged; clients cannot spoof workspace, version or timestamps.
create or replace function public.prepare_delegation_acknowledgment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_version int;
begin
  select da.workspace_id, di.version into v_workspace_id, v_version
  from public.delegation_assignments da
  join public.delegations d on d.id = da.delegation_id
  join public.delegation_instruments di on di.id = d.delegation_instrument_id
  where da.id = new.delegation_assignment_id;

  if v_workspace_id is null then
    raise exception 'unknown delegation assignment';
  end if;

  new.workspace_id := v_workspace_id;
  new.instrument_version := v_version;
  new.acknowledged_at := now();
  new.user_id := coalesce((select auth.uid()), new.user_id);
  return new;
end;
$$;

create trigger delegation_acks_prepare
  before insert on public.delegation_acknowledgments
  for each row execute function public.prepare_delegation_acknowledgment();

create trigger delegation_acks_immutable
  before update or delete on public.delegation_acknowledgments
  for each row execute function public.block_mutation();

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------

create trigger delegation_instruments_audit
  after insert or update or delete on public.delegation_instruments
  for each row execute function public.write_audit();

create trigger delegations_audit
  after insert or update or delete on public.delegations
  for each row execute function public.write_audit();

create trigger delegation_provisions_audit
  after insert or update or delete on public.delegation_provisions
  for each row execute function public.write_audit();

create trigger delegation_assignments_audit
  after insert or update or delete on public.delegation_assignments
  for each row execute function public.write_audit();

create trigger delegation_acknowledgments_audit
  after insert or update or delete on public.delegation_acknowledgments
  for each row execute function public.write_audit();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.delegation_instruments enable row level security;
alter table public.delegations enable row level security;
alter table public.delegation_provisions enable row level security;
alter table public.delegation_assignments enable row level security;
alter table public.delegation_acknowledgments enable row level security;

-- Instruments: members read, governance writes
create policy delegation_instruments_select on public.delegation_instruments
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy delegation_instruments_insert on public.delegation_instruments
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy delegation_instruments_update on public.delegation_instruments
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]))
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

-- Delegations: members read, governance writes; deletes allowed (trigger limits to drafts)
create policy delegations_select on public.delegations
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy delegations_insert on public.delegations
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy delegations_update on public.delegations
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]))
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy delegations_delete on public.delegations
  for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy delegation_provisions_select on public.delegation_provisions
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy delegation_provisions_insert on public.delegation_provisions
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy delegation_provisions_delete on public.delegation_provisions
  for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy delegation_assignments_select on public.delegation_assignments
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy delegation_assignments_insert on public.delegation_assignments
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy delegation_assignments_update on public.delegation_assignments
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]))
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy delegation_assignments_delete on public.delegation_assignments
  for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

-- Acknowledgments: member-wide reads (the register view must be truthful for
-- every role); inserts only by the current occupant for the current adopted
-- version of a currently effective assignment.
create policy delegation_acks_select on public.delegation_acknowledgments
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy delegation_acks_insert on public.delegation_acknowledgments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.delegation_assignments da
      join public.delegations d on d.id = da.delegation_id
      join public.delegation_instruments di on di.id = d.delegation_instrument_id
      join public.position_assignments pa on pa.id = delegation_acknowledgments.position_assignment_id
      where da.id = delegation_acknowledgments.delegation_assignment_id
        and di.status = 'adopted'
        and da.status = 'active'
        and da.effective_from <= public.current_sydney_date()
        and (da.effective_to is null or da.effective_to >= public.current_sydney_date())
        and pa.position_id = da.position_id
        and pa.user_id = (select auth.uid())
        and pa.start_date <= public.current_sydney_date()
        and (pa.end_date is null or pa.end_date >= public.current_sydney_date())
    )
  );
-- No update or delete policies: acknowledgments are append-only evidence.
