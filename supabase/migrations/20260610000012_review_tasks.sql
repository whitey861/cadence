-- Phase 1: review tasks. Polymorphic over policies and delegation instruments.
-- A scheduled review task is opened automatically when a policy is adopted
-- with a review cycle.

create type public.review_task_status as enum ('open', 'complete', 'cancelled');

create table public.review_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entity_type text not null check (entity_type in ('policy', 'delegation_instrument')),
  entity_id uuid not null,
  title text not null,
  due_date date not null,
  assigned_position_id uuid references public.positions (id),
  status public.review_task_status not null default 'open',
  completed_at timestamptz,
  completed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index review_tasks_workspace_idx on public.review_tasks (workspace_id);
create index review_tasks_entity_idx on public.review_tasks (entity_type, entity_id);
create index review_tasks_due_idx on public.review_tasks (workspace_id, due_date) where status = 'open';

create trigger review_tasks_updated_at
  before update on public.review_tasks
  for each row execute function public.set_updated_at();

create trigger review_tasks_audit
  after insert or update or delete on public.review_tasks
  for each row execute function public.write_audit();

-- Auto-open a scheduled review when a policy is adopted with a review cycle
create or replace function public.open_policy_review_task()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'adopted' and old.status is distinct from 'adopted'
     and new.next_review_date is not null then
    if not exists (
      select 1 from public.review_tasks
      where entity_type = 'policy' and entity_id = new.id and status = 'open'
    ) then
      insert into public.review_tasks
        (workspace_id, entity_type, entity_id, title, due_date, assigned_position_id)
      values
        (new.workspace_id, 'policy', new.id,
         'Scheduled review: ' || new.title, new.next_review_date, new.owner_position_id);
    end if;
  end if;
  return new;
end;
$$;

create trigger policies_open_review_task
  after update on public.policies
  for each row execute function public.open_policy_review_task();

-- RLS: members read; governance writes; the occupant of the assigned position
-- may also update (complete) their own review task.
alter table public.review_tasks enable row level security;

create policy review_tasks_select on public.review_tasks
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy review_tasks_insert on public.review_tasks
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[]));

create policy review_tasks_update on public.review_tasks
  for update to authenticated
  using (
    public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[])
    or exists (
      select 1 from public.position_assignments pa
      where pa.position_id = review_tasks.assigned_position_id
        and pa.user_id = (select auth.uid())
        and pa.start_date <= public.current_sydney_date()
        and (pa.end_date is null or pa.end_date >= public.current_sydney_date())
    )
  )
  with check (
    public.has_workspace_role(workspace_id, array['admin', 'governance_officer']::public.membership_role[])
    or exists (
      select 1 from public.position_assignments pa
      where pa.position_id = review_tasks.assigned_position_id
        and pa.user_id = (select auth.uid())
        and pa.start_date <= public.current_sydney_date()
        and (pa.end_date is null or pa.end_date >= public.current_sydney_date())
    )
  );
-- No delete policy: tasks are cancelled, not removed.
