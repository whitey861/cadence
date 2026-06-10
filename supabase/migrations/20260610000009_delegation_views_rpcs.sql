-- Phase 1: delegation lifecycle RPCs and register views.
-- RPCs are security invoker so RLS gates who can call them in practice.
-- Views are security invoker so the underlying RLS applies to every reader.

-- Supersede: clone an adopted instrument into a new draft (version + 1) with a
-- deep copy of delegations, provision links and active assignments. The source
-- stays in force (adopted) until the successor is adopted.
create or replace function public.supersede_delegation_instrument(p_instrument_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_src public.delegation_instruments%rowtype;
  v_new_id uuid := gen_random_uuid();
  v_d public.delegations%rowtype;
  v_new_delegation_id uuid;
begin
  select * into v_src
  from public.delegation_instruments
  where id = p_instrument_id
  for update;

  if not found then
    raise exception 'instrument not found';
  end if;
  if v_src.status <> 'adopted' then
    raise exception 'only adopted instruments can be superseded';
  end if;

  insert into public.delegation_instruments
    (id, workspace_id, family_id, title, instrument_type, status, version, supersedes_id)
  values
    (v_new_id, v_src.workspace_id, v_src.family_id, v_src.title, v_src.instrument_type,
     'draft', v_src.version + 1, v_src.id);

  -- Sequential statements, not one CTE: the assignment trigger must be able to
  -- see the freshly copied delegations, and same-statement CTE inserts are
  -- invisible to it.
  for v_d in
    select * from public.delegations
    where delegation_instrument_id = p_instrument_id
    order by sort_order
  loop
    v_new_delegation_id := gen_random_uuid();

    insert into public.delegations
      (id, workspace_id, delegation_instrument_id, function_title, function_description,
       conditions_limitations, sort_order)
    values
      (v_new_delegation_id, v_d.workspace_id, v_new_id, v_d.function_title,
       v_d.function_description, v_d.conditions_limitations, v_d.sort_order);

    insert into public.delegation_provisions (workspace_id, delegation_id, provision_id)
    select dp.workspace_id, v_new_delegation_id, dp.provision_id
    from public.delegation_provisions dp
    where dp.delegation_id = v_d.id;

    insert into public.delegation_assignments
      (workspace_id, delegation_id, position_id, effective_from, effective_to, status)
    select da.workspace_id, v_new_delegation_id, da.position_id,
           da.effective_from, da.effective_to, da.status
    from public.delegation_assignments da
    where da.delegation_id = v_d.id and da.status = 'active';
  end loop;

  return v_new_id;
end;
$$;

-- Adopt: predecessor (if any) becomes superseded first, then the draft is
-- adopted; the one-adopted-per-family index enforces the ordering.
create or replace function public.adopt_delegation_instrument(
  p_instrument_id uuid,
  p_adopted_date date,
  p_resolution_reference text default null
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_src public.delegation_instruments%rowtype;
begin
  select * into v_src
  from public.delegation_instruments
  where id = p_instrument_id
  for update;

  if not found then
    raise exception 'instrument not found';
  end if;
  if v_src.status <> 'draft' then
    raise exception 'only drafts can be adopted';
  end if;

  if v_src.supersedes_id is not null then
    update public.delegation_instruments
    set status = 'superseded'
    where id = v_src.supersedes_id and status = 'adopted';
  end if;

  update public.delegation_instruments
  set status = 'adopted',
      adopted_date = p_adopted_date,
      resolution_reference = coalesce(p_resolution_reference, resolution_reference)
  where id = p_instrument_id;
end;
$$;

revoke execute on function public.supersede_delegation_instrument(uuid) from public, anon;
revoke execute on function public.adopt_delegation_instrument(uuid, date, text) from public, anon;

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

create view public.current_position_occupants
with (security_invoker = true) as
select pa.workspace_id, pa.position_id, pa.id as position_assignment_id,
       pa.user_id, pa.assignment_type, pa.start_date, pa.end_date
from public.position_assignments pa
where pa.start_date <= public.current_sydney_date()
  and (pa.end_date is null or pa.end_date >= public.current_sydney_date());

-- The current register: one row per delegation x position x current occupant
-- for adopted instruments and currently effective assignments. Vacant positions
-- still appear (occupant columns null) because the position holds the
-- delegation regardless of staffing. Flat scalars only, so text/csv works.
create view public.delegations_register
with (security_invoker = true) as
select
  di.workspace_id,
  di.id as instrument_id,
  di.title as instrument_title,
  di.instrument_type,
  di.version as instrument_version,
  di.adopted_date,
  di.resolution_reference,
  d.id as delegation_id,
  d.function_title,
  d.function_description,
  d.conditions_limitations,
  prov.provisions_text,
  da.id as delegation_assignment_id,
  da.effective_from,
  da.effective_to,
  p.id as position_id,
  p.title as position_title,
  p.position_code,
  ou.id as org_unit_id,
  ou.name as org_unit_name,
  occ.position_assignment_id,
  occ.user_id as occupant_user_id,
  pr.display_name as occupant_name,
  ack.id as acknowledgment_id,
  ack.acknowledged_at,
  (occ.user_id is not null and ack.id is null) as acknowledgment_pending
from public.delegation_instruments di
join public.delegations d on d.delegation_instrument_id = di.id
join public.delegation_assignments da on da.delegation_id = d.id
join public.positions p on p.id = da.position_id
left join public.org_units ou on ou.id = p.org_unit_id
left join public.current_position_occupants occ on occ.position_id = p.id
left join public.profiles pr on pr.id = occ.user_id
left join public.delegation_acknowledgments ack
  on ack.delegation_assignment_id = da.id
 and ack.position_assignment_id = occ.position_assignment_id
left join lateral (
  select string_agg(li.name || ' ' || lp.reference, '; ' order by li.name, lp.reference) as provisions_text
  from public.delegation_provisions dp
  join public.legislative_provisions lp on lp.id = dp.provision_id
  join public.legislative_instruments li on li.id = lp.instrument_id
  where dp.delegation_id = d.id
) prov on true
where di.status = 'adopted'
  and da.status = 'active'
  and da.effective_from <= public.current_sydney_date()
  and (da.effective_to is null or da.effective_to >= public.current_sydney_date());

create view public.pending_delegation_acknowledgments
with (security_invoker = true) as
select workspace_id, instrument_id, instrument_title, instrument_version,
       delegation_id, function_title, conditions_limitations, provisions_text,
       delegation_assignment_id, position_assignment_id,
       position_id, position_title, org_unit_id, org_unit_name,
       occupant_user_id, occupant_name
from public.delegations_register
where acknowledgment_pending;

create view public.delegation_ack_compliance_by_org_unit
with (security_invoker = true) as
select workspace_id, org_unit_id, org_unit_name,
       count(*) filter (where occupant_user_id is not null) as required,
       count(acknowledgment_id) as acknowledged,
       count(*) filter (where acknowledgment_pending) as pending
from public.delegations_register
group by workspace_id, org_unit_id, org_unit_name;

grant select on public.current_position_occupants to authenticated;
grant select on public.delegations_register to authenticated;
grant select on public.pending_delegation_acknowledgments to authenticated;
grant select on public.delegation_ack_compliance_by_org_unit to authenticated;
