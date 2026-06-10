-- Phase 0: core tenancy. Workspaces, profiles, memberships, RLS helpers.
-- Every domain table carries workspace_id; RLS via membership helpers below.

create extension if not exists pgcrypto;

-- Enums
create type public.membership_role as enum (
  'admin', 'governance_officer', 'risk_owner', 'manager', 'staff', 'read_only'
);
create type public.membership_status as enum ('active', 'invited', 'suspended', 'removed');

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Workspaces: one per council
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  state text not null default 'NSW',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- Profiles: mirror of auth.users for app-visible identity
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile when an auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Memberships: roles live here, never on the user
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.membership_role not null default 'staff',
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_workspace_id_idx on public.memberships (workspace_id);

create trigger memberships_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

-- RLS helpers. security definer so policies on memberships do not recurse.
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function public.has_workspace_role(ws uuid, allowed public.membership_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any (allowed)
  );
$$;

-- True when the target user shares at least one active workspace with the caller
create or replace function public.shares_workspace_with(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs
      on mine.workspace_id = theirs.workspace_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'active'
      and theirs.user_id = target
      and theirs.status = 'active'
  );
$$;

-- RLS
alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;

create policy workspaces_select on public.workspaces
  for select to authenticated
  using (public.is_workspace_member(id));

create policy workspaces_update on public.workspaces
  for update to authenticated
  using (public.has_workspace_role(id, array['admin']::public.membership_role[]))
  with check (public.has_workspace_role(id, array['admin']::public.membership_role[]));

-- Workspace creation and deletion are service operations, no client policies.

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy memberships_select on public.memberships
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy memberships_insert on public.memberships
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['admin']::public.membership_role[]));

create policy memberships_update on public.memberships
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['admin']::public.membership_role[]))
  with check (public.has_workspace_role(workspace_id, array['admin']::public.membership_role[]));

-- Memberships are removed via status transitions, not hard deletes. No delete policy.
