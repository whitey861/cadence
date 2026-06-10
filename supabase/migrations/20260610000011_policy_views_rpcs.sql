-- Phase 1: policy lifecycle RPCs and acknowledgment views.

-- Supersede: allowed from adopted or under_review (a review concluding a
-- rewrite flows straight into drafting the successor). Copies requirements.
create or replace function public.supersede_policy(p_policy_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_src public.policies%rowtype;
  v_new_id uuid := gen_random_uuid();
begin
  select * into v_src
  from public.policies
  where id = p_policy_id
  for update;

  if not found then
    raise exception 'policy not found';
  end if;
  if v_src.status not in ('adopted', 'under_review') then
    raise exception 'only adopted policies or policies under review can be superseded';
  end if;

  insert into public.policies
    (id, workspace_id, family_id, title, policy_number, category, owner_position_id,
     status, version, supersedes_id, review_cycle_months, body_storage_path)
  values
    (v_new_id, v_src.workspace_id, v_src.family_id, v_src.title, v_src.policy_number,
     v_src.category, v_src.owner_position_id, 'draft', v_src.version + 1, v_src.id,
     v_src.review_cycle_months, v_src.body_storage_path);

  insert into public.policy_ack_requirements (workspace_id, policy_id, scope, scope_ref)
  select workspace_id, v_new_id, scope, scope_ref
  from public.policy_ack_requirements
  where policy_id = p_policy_id;

  return v_new_id;
end;
$$;

-- Adopt: predecessor (adopted or under_review) becomes superseded first.
-- next_review_date is computed from the review cycle.
create or replace function public.adopt_policy(p_policy_id uuid, p_adopted_date date)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_src public.policies%rowtype;
begin
  select * into v_src
  from public.policies
  where id = p_policy_id
  for update;

  if not found then
    raise exception 'policy not found';
  end if;
  if v_src.status not in ('draft', 'consultation') then
    raise exception 'only draft or consultation policies can be adopted';
  end if;

  if v_src.supersedes_id is not null then
    update public.policies
    set status = 'superseded'
    where id = v_src.supersedes_id and status in ('adopted', 'under_review');
  end if;

  update public.policies
  set status = 'adopted',
      adopted_date = p_adopted_date,
      next_review_date = case
        when v_src.review_cycle_months is not null
        then p_adopted_date + (v_src.review_cycle_months || ' months')::interval
        else null
      end::date
  where id = p_policy_id;
end;
$$;

revoke execute on function public.supersede_policy(uuid) from public, anon;
revoke execute on function public.adopt_policy(uuid, date) from public, anon;

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

-- Who must acknowledge what: requirement scope expanded to users via active
-- membership (read_only excluded) and current occupancy for scoped requirements.
create view public.policy_ack_targets
with (security_invoker = true) as
select
  r.id as requirement_id,
  p.id as policy_id,
  p.workspace_id,
  p.title as policy_title,
  p.policy_number,
  p.version as policy_version,
  r.scope,
  r.scope_ref,
  m.user_id,
  pr.display_name as user_name
from public.policy_ack_requirements r
join public.policies p on p.id = r.policy_id
join public.memberships m
  on m.workspace_id = p.workspace_id
 and m.status = 'active'
 and m.role <> 'read_only'
left join public.profiles pr on pr.id = m.user_id
where p.status = 'adopted'
  and (
    r.scope = 'all_staff'
    or (r.scope = 'org_unit' and exists (
          select 1
          from public.current_position_occupants occ
          join public.positions pos on pos.id = occ.position_id
          where occ.user_id = m.user_id and pos.org_unit_id = r.scope_ref
        ))
    or (r.scope = 'position' and exists (
          select 1
          from public.current_position_occupants occ
          where occ.user_id = m.user_id and occ.position_id = r.scope_ref
        ))
  );

create view public.pending_policy_acknowledgments
with (security_invoker = true) as
select t.*
from public.policy_ack_targets t
left join public.policy_acknowledgments a
  on a.requirement_id = t.requirement_id and a.user_id = t.user_id
where a.id is null;

-- Compliance grouped by the org unit of the target user's current position.
-- Users without a position land in the null bucket.
create view public.policy_ack_compliance_by_org_unit
with (security_invoker = true) as
select
  t.workspace_id,
  t.policy_id,
  t.policy_title,
  t.policy_number,
  pos.org_unit_id,
  ou.name as org_unit_name,
  count(distinct t.user_id) as required,
  count(distinct a.user_id) as acknowledged,
  count(distinct t.user_id) - count(distinct a.user_id) as pending
from public.policy_ack_targets t
left join public.current_position_occupants occ
  on occ.user_id = t.user_id and occ.workspace_id = t.workspace_id
left join public.positions pos on pos.id = occ.position_id
left join public.org_units ou on ou.id = pos.org_unit_id
left join public.policy_acknowledgments a
  on a.requirement_id = t.requirement_id and a.user_id = t.user_id
group by t.workspace_id, t.policy_id, t.policy_title, t.policy_number, pos.org_unit_id, ou.name;

-- Flat register for the policies table and CSV export. Superseded and archived
-- versions are history, not register entries.
create view public.policies_register
with (security_invoker = true) as
select
  p.workspace_id,
  p.id as policy_id,
  p.policy_number,
  p.title,
  p.category,
  p.status,
  p.version,
  p.adopted_date,
  p.review_cycle_months,
  p.next_review_date,
  p.owner_position_id,
  pos.title as owner_position_title,
  ou.id as org_unit_id,
  ou.name as org_unit_name
from public.policies p
left join public.positions pos on pos.id = p.owner_position_id
left join public.org_units ou on ou.id = pos.org_unit_id
where p.status not in ('superseded', 'archived');

grant select on public.policy_ack_targets to authenticated;
grant select on public.pending_policy_acknowledgments to authenticated;
grant select on public.policy_ack_compliance_by_org_unit to authenticated;
grant select on public.policies_register to authenticated;
