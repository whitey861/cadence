-- Phase 0: polymorphic attachments and comments, shared by all modules.

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index attachments_workspace_id_idx on public.attachments (workspace_id);
create index attachments_entity_idx on public.attachments (entity_type, entity_id);
create index attachments_uploaded_by_idx on public.attachments (uploaded_by);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  body text not null,
  author_user_id uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index comments_workspace_id_idx on public.comments (workspace_id);
create index comments_entity_idx on public.comments (entity_type, entity_id);
create index comments_author_idx on public.comments (author_user_id);

create trigger comments_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- RLS: members read; any writing role may create; authors manage their own.
alter table public.attachments enable row level security;
alter table public.comments enable row level security;

create policy attachments_select on public.attachments
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy attachments_insert on public.attachments
  for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and public.has_workspace_role(workspace_id, array['admin', 'governance_officer', 'risk_owner', 'manager', 'staff']::public.membership_role[])
  );

create policy attachments_delete on public.attachments
  for delete to authenticated
  using (
    uploaded_by = (select auth.uid())
    or public.has_workspace_role(workspace_id, array['admin']::public.membership_role[])
  );

create policy comments_select on public.comments
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy comments_insert on public.comments
  for insert to authenticated
  with check (
    author_user_id = (select auth.uid())
    and public.has_workspace_role(workspace_id, array['admin', 'governance_officer', 'risk_owner', 'manager', 'staff']::public.membership_role[])
  );

-- Comments soft delete via deleted_at; authors edit their own rows only.
create policy comments_update on public.comments
  for update to authenticated
  using (author_user_id = (select auth.uid()))
  with check (author_user_id = (select auth.uid()));
