-- Canonical demo seed for Casuarina Shire Council. Idempotent: every block
-- guards on natural keys, so it is safe to re-run. Applied automatically by
-- `supabase db reset` locally; the same file seeds the hosted demo project.
-- Test accounts share the password from TEST_PASSWORD (dev hash below).

-- ---------------------------------------------------------------------------
-- Base: workspace, org structure, positions, test accounts
-- ---------------------------------------------------------------------------

do $$
declare
  pw text := '8f8ceab4295b5494';
  ws uuid;
  ogm uuid; corp uuid; govrisk uuid;
  u record;
begin
  select id into ws from public.workspaces where slug = 'casuarina';
  if ws is null then
    insert into public.workspaces (name, slug, state, settings)
    values ('Casuarina Shire Council', 'casuarina', 'NSW', '{"timezone":"Australia/Sydney"}')
    returning id into ws;
  end if;

  insert into public.org_units (workspace_id, name, code, unit_type)
  select ws, v.name, v.code, v.unit_type::public.org_unit_type
  from (values
    ('Office of the General Manager', 'OGM', 'directorate'),
    ('Corporate Services', 'CS', 'directorate'),
    ('Infrastructure and Environment', 'IE', 'directorate'),
    ('Community and Place', 'CP', 'directorate')
  ) as v(name, code, unit_type)
  where not exists (select 1 from public.org_units where workspace_id = ws and code = v.code);

  select id into corp from public.org_units where workspace_id = ws and code = 'CS';

  insert into public.org_units (workspace_id, parent_id, name, code, unit_type)
  select ws, corp, 'Governance and Risk', 'CS-GR', 'division'
  where not exists (select 1 from public.org_units where workspace_id = ws and code = 'CS-GR');

  select id into ogm from public.org_units where workspace_id = ws and code = 'OGM';
  select id into govrisk from public.org_units where workspace_id = ws and code = 'CS-GR';

  insert into public.positions (workspace_id, org_unit_id, title, position_code)
  select ws,
         case v.unit when 'OGM' then ogm when 'CS' then corp else govrisk end,
         v.title, v.code
  from (values
    ('General Manager', 'POS-0001', 'OGM'),
    ('Director Corporate Services', 'POS-0002', 'CS'),
    ('Manager Governance and Risk', 'POS-0003', 'CS-GR'),
    ('Governance Officer', 'POS-0004', 'CS-GR'),
    ('Risk and Audit Coordinator', 'POS-0005', 'CS-GR'),
    ('Administration Officer', 'POS-0006', 'CS')
  ) as v(title, code, unit)
  where not exists (select 1 from public.positions where workspace_id = ws and position_code = v.code);

  for u in
    select * from (values
      ('admin@test.local', 'Ada Admin', 'admin', 'POS-0002'),
      ('governance@test.local', 'Grace Governance', 'governance_officer', 'POS-0004'),
      ('risk@test.local', 'Rohan Risk', 'risk_owner', 'POS-0005'),
      ('manager@test.local', 'Mia Manager', 'manager', 'POS-0003'),
      ('staff@test.local', 'Sam Staff', 'staff', 'POS-0006'),
      ('readonly@test.local', 'Riley Readonly', 'read_only', null)
    ) as t(email, display_name, role, position_code)
  loop
    if not exists (select 1 from auth.users where email = u.email) then
      insert into auth.users
        (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
         confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current)
      values
        ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
         u.email, crypt(pw, gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', u.display_name),
         now(), now(), '', '', '', '', '');

      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      select gen_random_uuid(), au.id, au.id::text,
             jsonb_build_object('sub', au.id::text, 'email', au.email, 'email_verified', true, 'phone_verified', false),
             'email', now(), now(), now()
      from auth.users au where au.email = u.email;
    end if;

    insert into public.memberships (workspace_id, user_id, role, status)
    select ws, au.id, u.role::public.membership_role, 'active'
    from auth.users au
    where au.email = u.email
    on conflict (workspace_id, user_id) do nothing;

    if u.position_code is not null then
      insert into public.position_assignments (workspace_id, position_id, user_id, assignment_type, start_date)
      select ws, p.id, au.id, 'substantive', date '2024-07-01'
      from auth.users au, public.positions p
      where au.email = u.email and p.workspace_id = ws and p.position_code = u.position_code
        and not exists (
          select 1 from public.position_assignments pa
          where pa.position_id = p.id and pa.user_id = au.id
        );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Phase 1: NSW legislative provision pack
-- ---------------------------------------------------------------------------

insert into public.legislative_instruments (name, jurisdiction, source_url)
select v.name, 'NSW', v.url
from (values
  ('Local Government Act 1993', 'https://legislation.nsw.gov.au/view/html/inforce/current/act-1993-030'),
  ('Local Government (General) Regulation 2021', 'https://legislation.nsw.gov.au/view/html/inforce/current/sl-2021-0460'),
  ('Environmental Planning and Assessment Act 1979', 'https://legislation.nsw.gov.au/view/html/inforce/current/act-1979-203'),
  ('Protection of the Environment Operations Act 1997', 'https://legislation.nsw.gov.au/view/html/inforce/current/act-1997-156'),
  ('Roads Act 1993', 'https://legislation.nsw.gov.au/view/html/inforce/current/act-1993-033'),
  ('Crown Land Management Act 2016', 'https://legislation.nsw.gov.au/view/html/inforce/current/act-2016-058'),
  ('Companion Animals Act 1998', 'https://legislation.nsw.gov.au/view/html/inforce/current/act-1998-087'),
  ('Food Act 2003', 'https://legislation.nsw.gov.au/view/html/inforce/current/act-2003-043'),
  ('Impounding Act 1993', 'https://legislation.nsw.gov.au/view/html/inforce/current/act-1993-031'),
  ('Government Information (Public Access) Act 2009', 'https://legislation.nsw.gov.au/view/html/inforce/current/act-2009-052')
) as v(name, url)
on conflict (name) do nothing;

insert into public.legislative_provisions (instrument_id, reference, description)
select li.id, v.reference, v.description
from (values
  ('Local Government Act 1993', 's 55', 'Requirements for tendering'),
  ('Local Government Act 1993', 's 68', 'Approvals for certain activities'),
  ('Local Government Act 1993', 's 124', 'Orders'),
  ('Local Government Act 1993', 's 356', 'Financial assistance to persons and organisations'),
  ('Local Government Act 1993', 's 377', 'General power of the council to delegate'),
  ('Local Government Act 1993', 's 378', 'Delegations by the general manager'),
  ('Local Government Act 1993', 's 380', 'Review of delegations'),
  ('Local Government Act 1993', 's 603', 'Certificate as to rates and charges'),
  ('Local Government Act 1993', 's 735A', 'Certificate as to notices and orders'),
  ('Local Government (General) Regulation 2021', 'cl 178', 'Acceptance of tenders'),
  ('Local Government (General) Regulation 2021', 'cl 214', 'Council investments'),
  ('Environmental Planning and Assessment Act 1979', 's 4.16', 'Determination of development applications'),
  ('Environmental Planning and Assessment Act 1979', 's 4.55', 'Modification of development consents'),
  ('Environmental Planning and Assessment Act 1979', 's 9.34', 'Development control orders'),
  ('Environmental Planning and Assessment Act 1979', 's 10.7', 'Planning certificates'),
  ('Protection of the Environment Operations Act 1997', 's 91', 'Clean-up notices'),
  ('Protection of the Environment Operations Act 1997', 's 96', 'Prevention notices'),
  ('Protection of the Environment Operations Act 1997', 's 222', 'Penalty notices'),
  ('Roads Act 1993', 's 125', 'Footway restaurant approvals'),
  ('Roads Act 1993', 's 138', 'Works and structures on public roads'),
  ('Crown Land Management Act 2016', 's 3.21', 'Functions of councils as Crown land managers'),
  ('Crown Land Management Act 2016', 's 2.20', 'Leases and licences over Crown land'),
  ('Companion Animals Act 1998', 's 34', 'Declaration of dangerous dogs'),
  ('Companion Animals Act 1998', 's 47', 'Nuisance dog orders'),
  ('Food Act 2003', 's 66', 'Improvement notices'),
  ('Food Act 2003', 's 60', 'Prohibition orders'),
  ('Impounding Act 1993', 's 16', 'Impounding of animals and articles'),
  ('Government Information (Public Access) Act 2009', 's 9', 'Right of access to government information'),
  ('Government Information (Public Access) Act 2009', 's 58', 'Decisions on access applications')
) as v(instrument, reference, description)
join public.legislative_instruments li on li.name = v.instrument
on conflict (instrument_id, reference) do nothing;

-- ---------------------------------------------------------------------------
-- Phase 1: Council to GM instrument (5 delegations, all to the GM position)
-- ---------------------------------------------------------------------------

do $$
declare
  ws uuid;
  v_instrument uuid;
  pos_gm uuid;
begin
  select id into ws from public.workspaces where slug = 'casuarina';
  select id into pos_gm from public.positions where workspace_id = ws and position_code = 'POS-0001';

  if exists (
    select 1 from public.delegation_instruments
    where workspace_id = ws and title = 'Instrument of Delegation: Council to General Manager'
  ) then
    return;
  end if;

  insert into public.delegation_instruments (workspace_id, title, instrument_type)
  values (ws, 'Instrument of Delegation: Council to General Manager', 'council_to_gm')
  returning id into v_instrument;

  insert into public.delegations
    (workspace_id, delegation_instrument_id, function_title, function_description, conditions_limitations, sort_order)
  select ws, v_instrument, v.title, v.description, v.conditions, v.sort_order
  from (values
    (1, 'General management of council operations',
     'Direction and control of the day to day management of the council in accordance with the Act and adopted policies.',
     'Subject to the Act, adopted policies and the adopted budget.'),
    (2, 'Acceptance of tenders',
     'Acceptance of tenders for goods, services and works within the adopted budget.',
     'Excludes tenders the Act requires the council itself to accept by resolution. Limit $500,000 including GST per contract.'),
    (3, 'Determination of development applications',
     'Determination of development applications and modification applications under the Environmental Planning and Assessment Act 1979.',
     'Excludes applications attracting ten or more unresolved objections and council-related development.'),
    (4, 'Granting of financial assistance',
     'Granting of financial assistance to persons and organisations under s 356 of the Local Government Act 1993.',
     'In accordance with the adopted community grants program and within budget allocations.'),
    (5, 'Issue of orders',
     'Issue of orders under s 124 of the Local Government Act 1993 and development control orders.',
     'Subject to the procedural requirements of the relevant Act.')
  ) as v(sort_order, title, description, conditions);

  insert into public.delegation_provisions (workspace_id, delegation_id, provision_id)
  select ws, d.id, lp.id
  from (values
    ('General management of council operations', 'Local Government Act 1993', 's 377'),
    ('Acceptance of tenders', 'Local Government Act 1993', 's 55'),
    ('Acceptance of tenders', 'Local Government (General) Regulation 2021', 'cl 178'),
    ('Determination of development applications', 'Environmental Planning and Assessment Act 1979', 's 4.16'),
    ('Determination of development applications', 'Environmental Planning and Assessment Act 1979', 's 4.55'),
    ('Granting of financial assistance', 'Local Government Act 1993', 's 356'),
    ('Issue of orders', 'Local Government Act 1993', 's 124'),
    ('Issue of orders', 'Environmental Planning and Assessment Act 1979', 's 9.34')
  ) as v(function_title, instrument, reference)
  join public.delegations d
    on d.delegation_instrument_id = v_instrument and d.function_title = v.function_title
  join public.legislative_instruments li on li.name = v.instrument
  join public.legislative_provisions lp on lp.instrument_id = li.id and lp.reference = v.reference;

  insert into public.delegation_assignments (workspace_id, delegation_id, position_id, effective_from)
  select ws, d.id, pos_gm, date '2024-09-23'
  from public.delegations d
  where d.delegation_instrument_id = v_instrument;

  perform public.adopt_delegation_instrument(v_instrument, date '2024-09-23', 'MIN 2024/187');
end $$;

-- ---------------------------------------------------------------------------
-- Phase 1: GM to staff sub-delegation instrument (30 delegations)
-- ---------------------------------------------------------------------------

do $$
declare
  ws uuid;
  v_instrument uuid;
begin
  select id into ws from public.workspaces where slug = 'casuarina';

  if exists (
    select 1 from public.delegation_instruments
    where workspace_id = ws and title = 'Instrument of Sub-Delegation: General Manager to Staff'
  ) then
    return;
  end if;

  insert into public.delegation_instruments (workspace_id, title, instrument_type)
  values (ws, 'Instrument of Sub-Delegation: General Manager to Staff', 'gm_to_staff')
  returning id into v_instrument;

  -- 30 delegations: 6 per position across the five non-GM positions
  insert into public.delegations
    (workspace_id, delegation_instrument_id, function_title, function_description, conditions_limitations, sort_order)
  select ws, v_instrument, v.title, v.description, v.conditions, v.sort_order
  from (values
    -- Director Corporate Services (POS-0002)
    (1,  'Acceptance of tenders to $250,000', 'Acceptance of tenders for goods, services and works.', 'Limit $250,000 including GST. Within adopted budget. Two written quotations required above $50,000.'),
    (2,  'Execution of contracts to $250,000', 'Execution of contracts and purchase orders for approved procurement.', 'Within adopted budget and procurement policy thresholds.'),
    (3,  'Financial assistance to $5,000', 'Approval of financial assistance under the adopted community grants program.', 'Limit $5,000 per recipient per financial year. Within program budget.'),
    (4,  'Write-off of debts to $10,000', 'Write-off of unrecoverable debts and accounts.', 'Limit $10,000 per debtor. Quarterly report to the Audit Risk and Improvement Committee.'),
    (5,  'Settlement of insurance claims to $20,000', 'Settlement and payment of insurance claims by and against the council.', 'Limit $20,000 per claim. In consultation with the insurer.'),
    (6,  'Investment of surplus funds', 'Investment of surplus council funds in accordance with the investment policy.', 'Per cl 214 of the Regulation and the Ministerial Investment Order.'),
    -- Manager Governance and Risk (POS-0003)
    (7,  'GIPA access application decisions', 'Deciding access applications under the Government Information (Public Access) Act 2009.', 'As nominated right to information officer.'),
    (8,  'Privacy management plan administration', 'Administration of the privacy management plan and handling of internal reviews.', 'Internal review findings reported to the General Manager.'),
    (9,  'Delegations register maintenance', 'Maintenance and periodic review of the delegations register.', 'Review at least annually per s 380.'),
    (10, 'Code of conduct complaint administration', 'Receipt and administrative handling of code of conduct complaints.', 'Substantive decisions remain with the General Manager or complaints coordinator under the adopted procedures.'),
    (11, 'Insurance program administration', 'Arrangement and renewal of council insurance coverage.', 'Within approved insurance budget.'),
    (12, 'Audit liaison', 'Coordination with internal and external auditors and the Audit Risk and Improvement Committee.', 'Excludes acceptance of audit findings on behalf of the council.'),
    -- Governance Officer (POS-0004)
    (13, 'Public notice publication', 'Publication of statutory public notices and exhibition arrangements.', 'Per statutory notice periods.'),
    (14, 'GIPA application processing', 'Processing and validation of formal access applications.', 'Decisions reserved to the Manager Governance and Risk.'),
    (15, 'Tender administration', 'Administration of tender processes including opening and registration of tenders.', 'Acceptance of tenders is not delegated.'),
    (16, 'Register maintenance: disclosures', 'Maintenance of registers of disclosures of interest and gifts.', 'Per the adopted code of conduct.'),
    (17, 'Certificates as to notices and orders', 'Issue of certificates as to outstanding notices and orders.', 'Per s 735A of the Local Government Act 1993.'),
    (18, 'Council meeting administration', 'Preparation and distribution of business papers and minutes.', 'Per the code of meeting practice.'),
    -- Risk and Audit Coordinator (POS-0005)
    (19, 'Risk register maintenance', 'Maintenance of the enterprise risk registers and risk reporting.', 'Per the adopted risk management framework.'),
    (20, 'Incident investigation', 'Investigation of reportable incidents and near misses.', 'WHS notifiable incidents escalated immediately.'),
    (21, 'Business continuity coordination', 'Coordination and testing of business continuity arrangements.', 'Activation of the plan rests with the General Manager.'),
    (22, 'Audit recommendation tracking', 'Tracking and reporting of audit recommendation implementation.', 'Quarterly reporting to the Audit Risk and Improvement Committee.'),
    (23, 'Clean-up notices', 'Issue of clean-up notices for pollution incidents.', 'Per s 91 of the POEO Act. Penalty notices require separate authorisation.'),
    (24, 'Prevention notices', 'Issue of prevention notices for environmentally unsatisfactory activities.', 'Per s 96 of the POEO Act. In consultation with the relevant director.'),
    -- Administration Officer (POS-0006)
    (25, 'Rates and charges certificates', 'Issue of certificates as to rates and charges.', 'Per s 603 of the Local Government Act 1993.'),
    (26, 'Planning certificates', 'Issue of planning certificates.', 'Per s 10.7 of the Environmental Planning and Assessment Act 1979. Content as prepared by the planning section.'),
    (27, 'Impounding of animals and articles', 'Impounding of stray animals and abandoned articles.', 'Per the Impounding Act 1993. Dangerous dog matters escalated to the ranger coordinator.'),
    (28, 'Receipt of submissions', 'Receipt and registration of tenders, submissions and applications.', 'Registration only; assessment is not delegated.'),
    (29, 'Footway restaurant approvals', 'Approval of footway restaurant applications.', 'Per s 125 of the Roads Act 1993 and the adopted footway dining policy.'),
    (30, 'Road opening permits', 'Approval of applications for works and structures on public roads.', 'Per s 138 of the Roads Act 1993. Standard conditions only; non-standard conditions escalated.')
  ) as v(sort_order, title, description, conditions);

  -- Provision links
  insert into public.delegation_provisions (workspace_id, delegation_id, provision_id)
  select ws, d.id, lp.id
  from (values
    ('Acceptance of tenders to $250,000', 'Local Government Act 1993', 's 55'),
    ('Acceptance of tenders to $250,000', 'Local Government (General) Regulation 2021', 'cl 178'),
    ('Financial assistance to $5,000', 'Local Government Act 1993', 's 356'),
    ('Investment of surplus funds', 'Local Government (General) Regulation 2021', 'cl 214'),
    ('GIPA access application decisions', 'Government Information (Public Access) Act 2009', 's 58'),
    ('GIPA application processing', 'Government Information (Public Access) Act 2009', 's 9'),
    ('Delegations register maintenance', 'Local Government Act 1993', 's 380'),
    ('Certificates as to notices and orders', 'Local Government Act 1993', 's 735A'),
    ('Clean-up notices', 'Protection of the Environment Operations Act 1997', 's 91'),
    ('Prevention notices', 'Protection of the Environment Operations Act 1997', 's 96'),
    ('Rates and charges certificates', 'Local Government Act 1993', 's 603'),
    ('Planning certificates', 'Environmental Planning and Assessment Act 1979', 's 10.7'),
    ('Impounding of animals and articles', 'Impounding Act 1993', 's 16'),
    ('Footway restaurant approvals', 'Roads Act 1993', 's 125'),
    ('Road opening permits', 'Roads Act 1993', 's 138')
  ) as v(function_title, instrument, reference)
  join public.delegations d
    on d.delegation_instrument_id = v_instrument and d.function_title = v.function_title
  join public.legislative_instruments li on li.name = v.instrument
  join public.legislative_provisions lp on lp.instrument_id = li.id and lp.reference = v.reference;

  -- Every sub-delegation also rests on s 378
  insert into public.delegation_provisions (workspace_id, delegation_id, provision_id)
  select ws, d.id, lp.id
  from public.delegations d
  join public.legislative_instruments li on li.name = 'Local Government Act 1993'
  join public.legislative_provisions lp on lp.instrument_id = li.id and lp.reference = 's 378'
  where d.delegation_instrument_id = v_instrument
  on conflict (delegation_id, provision_id) do nothing;

  -- Assignments by sort_order block: 1-6 Director CS, 7-12 Manager GR,
  -- 13-18 Governance Officer, 19-24 Risk Coordinator, 25-30 Admin Officer
  insert into public.delegation_assignments (workspace_id, delegation_id, position_id, effective_from)
  select ws, d.id, p.id, date '2025-02-03'
  from public.delegations d
  join public.positions p
    on p.workspace_id = ws
   and p.position_code = case
      when d.sort_order between 1 and 6 then 'POS-0002'
      when d.sort_order between 7 and 12 then 'POS-0003'
      when d.sort_order between 13 and 18 then 'POS-0004'
      when d.sort_order between 19 and 24 then 'POS-0005'
      else 'POS-0006'
    end
  where d.delegation_instrument_id = v_instrument;

  perform public.adopt_delegation_instrument(v_instrument, date '2025-02-03', 'GM Approval 2025/14');
end $$;

-- Acknowledgments: governance and manager accounts have acknowledged theirs;
-- staff (and the GM vacancies aside) remain pending so the demo shows the flow.
insert into public.delegation_acknowledgments
  (workspace_id, delegation_assignment_id, position_assignment_id, user_id, instrument_version)
select r.workspace_id, r.delegation_assignment_id, r.position_assignment_id, r.occupant_user_id, r.instrument_version
from public.delegations_register r
join auth.users au on au.id = r.occupant_user_id
where au.email in ('governance@test.local', 'manager@test.local', 'admin@test.local', 'risk@test.local')
  and r.acknowledgment_pending
on conflict (delegation_assignment_id, position_assignment_id) do nothing;

-- ---------------------------------------------------------------------------
-- Phase 1: policies
-- ---------------------------------------------------------------------------

do $$
declare
  ws uuid;
  v_policy uuid;
  v_corp_unit uuid;
  p record;
begin
  select id into ws from public.workspaces where slug = 'casuarina';
  select id into v_corp_unit from public.org_units where workspace_id = ws and code = 'CS';

  for p in
    select * from (values
      ('Code of Conduct', 'GOV-001', 'Governance', 'POS-0003', 48, date '2024-08-12', 'adopted', 'all_staff'),
      ('Procurement Policy', 'FIN-002', 'Finance', 'POS-0002', 36, date '2024-10-28', 'adopted', 'org_unit'),
      ('Work Health and Safety Policy', 'WHS-003', 'People and Safety', 'POS-0002', 24, date '2025-03-24', 'adopted', 'all_staff'),
      ('Records Management Policy', 'GOV-004', 'Governance', 'POS-0004', 36, date '2025-05-26', 'adopted', null),
      ('Gifts and Benefits Policy', 'GOV-005', 'Governance', 'POS-0003', 24, date '2025-08-25', 'adopted', 'all_staff'),
      ('Privacy Management Plan', 'GOV-006', 'Governance', 'POS-0003', 48, date '2025-11-24', 'adopted', null),
      ('Business Continuity Policy', 'RSK-007', 'Risk', 'POS-0005', 24, null, 'consultation', null),
      ('Media and Communications Policy', 'COM-008', 'Communications', 'POS-0002', 24, date '2024-07-01', 'under_review', null)
    ) as t(title, policy_number, category, owner_code, cycle_months, adopted, target_status, ack_scope)
  loop
    if exists (select 1 from public.policies where workspace_id = ws and policy_number = p.policy_number) then
      continue;
    end if;

    insert into public.policies
      (workspace_id, title, policy_number, category, owner_position_id, review_cycle_months)
    select ws, p.title, p.policy_number, p.category, pos.id, p.cycle_months
    from public.positions pos
    where pos.workspace_id = ws and pos.position_code = p.owner_code
    returning id into v_policy;

    if p.ack_scope = 'all_staff' then
      insert into public.policy_ack_requirements (workspace_id, policy_id, scope)
      values (ws, v_policy, 'all_staff');
    elsif p.ack_scope = 'org_unit' then
      insert into public.policy_ack_requirements (workspace_id, policy_id, scope, scope_ref)
      values (ws, v_policy, 'org_unit', v_corp_unit);
    end if;

    if p.target_status in ('adopted', 'under_review') then
      perform public.adopt_policy(v_policy, p.adopted);
    end if;
    if p.target_status = 'under_review' then
      update public.policies set status = 'under_review' where id = v_policy;
    end if;
    if p.target_status = 'consultation' then
      update public.policies set status = 'consultation' where id = v_policy;
    end if;
  end loop;
end $$;

-- Policy acknowledgments: everyone except the staff account has acknowledged,
-- so the staff quick-login lands with pending work for the demo.
insert into public.policy_acknowledgments (workspace_id, requirement_id, user_id, policy_version)
select t.workspace_id, t.requirement_id, t.user_id, t.policy_version
from public.pending_policy_acknowledgments t
join auth.users au on au.id = t.user_id
where au.email in ('governance@test.local', 'manager@test.local', 'admin@test.local', 'risk@test.local')
on conflict (requirement_id, user_id) do nothing;
