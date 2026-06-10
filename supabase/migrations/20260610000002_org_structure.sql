-- Phase 0: organisational structure. Org units, positions, position assignments.
-- Positions are first-class: delegations and ownership attach to positions, never users.

create type public.org_unit_type as enum ('directorate', 'division', 'section');
create type public.position_status as enum ('active', 'inactive', 'abolished');
create type public.assignment_type as enum ('substantive', 'acting', 'relieving');

create table public.org_units (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  parent_id uuid references public.org_units (id),
  name text not null,
  code text,
  unit_type public.org_unit_type not null default 'section',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index org_units_workspace_id_idx on public.org_units (workspace_id);
create index org_units_parent_id_idx on public.org_units (parent_id);

create trigger org_units_updated_at
  before update on public.org_units
  for each row execute function public.set_updated_at();

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  org_unit_id uuid references public.org_units (id),
  title text not null,
  position_code text,
  status public.position_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index positions_workspace_id_idx on public.positions (workspace_id);
create index positions_org_unit_id_idx on public.positions (org_unit_id);

create trigger positions_updated_at
  before update on public.positions
  for each row execute function public.set_updated_at();

create table public.position_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  position_id uuid not null references public.positions (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  assignment_type public.assignment_type not null default 'substantive',
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_dates_valid check (end_date is null or end_date >= start_date)
);

create index position_assignments_workspace_id_idx on public.position_assignments (workspace_id);
create index position_assignments_position_id_idx on public.position_assignments (position_id);
create index position_assignments_user_id_idx on public.position_assignments (user_id);

create trigger position_assignments_updated_at
  before update on public.position_assignments
  for each row execute function public.set_updated_at();

-- RLS: members read, admin and governance_officer write.
alter table public.org_units enable row level security;
alter table public.positions enable row level security;
alter table public.position_assignments enable row level security;

create policy org_units_select on public.org_units
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy org_units_insert on public.org_units
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy org_units_update on public.org_units
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]))
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy positions_select on public.positions
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy positions_insert on public.positions
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy positions_update on public.positions
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]))
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy position_assignments_select on public.position_assignments
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy position_assignments_insert on public.position_assignments
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy position_assignments_update on public.position_assignments
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]))
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

-- Org structure is corrected via status transitions and end dates, no hard deletes from clients.
