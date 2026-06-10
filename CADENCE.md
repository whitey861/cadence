# CADENCE.md - Living Project File

Adevus product. GRC and corporate planning platform for Australian local government. Pulse Software Governance suite replacement. This file is the source of truth for spec, architecture, design, progress, decisions, and testing notes.

Last updated: 10 June 2026 (initial draft)

---

## 1. Product thesis

Pulse (now Springbrook-owned, US PE roll-up, mid re-platforming via Project UNIFI) holds the AU local government GRC and IP&R market with dated UX and rising prices. Cadence wins on: modern UX, position-based delegations done properly, a genuinely good statutory report generator, AI-assisted drafting (risk descriptions, progress commentary, policy review summaries), and transparent per-module pricing. Primary reference site: PMHC (subject to proper procurement separation and conflict declarations, tracked outside this file).

The wedge is Delegations and Policies: every NSW council needs it, the compliance burden is statutory, the data model is contained, and incumbents do it badly.

## 2. Architecture summary

- Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui, TanStack Table, react-hook-form + zod, recharts
- Self-hosted Supabase per Beacon pattern (ECS Fargate, nginx proxy, Cloud Map namespace, RDS Postgres 18)
- Multi-tenant via workspace_id + RLS on every table; roles on memberships
- Report generation: `docx` package server-side in Phase 3; dedicated PDF/conversion worker (LibreOffice container, SQS-fed) in Phase 4
- Notifications/reminders: Postgres-scheduled (pg_cron) job table read by a worker; email via SES

## 3. Data model

### 3.1 Core and tenancy

- workspaces: id, name, slug, state (NSW etc), settings jsonb
- users: Supabase auth.users + profiles (display_name, email, phone)
- memberships: workspace_id, user_id, role enum(admin, governance_officer, risk_owner, manager, staff, read_only), status
- org_units: workspace_id, parent_id (self-ref hierarchy), name, code, unit_type (directorate, division, section)
- positions: workspace_id, org_unit_id, title, position_code, status
- position_assignments: position_id, user_id, start_date, end_date, assignment_type (substantive, acting, relieving)
- audit_log: append-only. workspace_id, actor_user_id, entity_type, entity_id, action, before jsonb, after jsonb, occurred_at
- attachments: polymorphic (entity_type, entity_id), Supabase Storage path, uploaded_by
- comments: polymorphic, body, author

### 3.2 Module: Delegations and Policies (Phase 1)

- legislative_instruments: name (e.g. Local Government Act 1993), jurisdiction, source_url
- legislative_provisions: instrument_id, reference (e.g. s 377), description
- delegation_instruments: workspace_id, title, instrument_type (council_to_gm, gm_to_staff), adopted_date, resolution_reference, status (draft, adopted, superseded), version, supersedes_id
- delegations: delegation_instrument_id, function_title, function_description, conditions_limitations, provisions (m2m to legislative_provisions)
- delegation_assignments: delegation_id, position_id, effective_from, effective_to, status
- delegation_acknowledgments: assignment_id, user_id, acknowledged_at, instrument_version. A new acknowledgment is required when the occupant changes or the instrument version changes.
- policies: workspace_id, title, policy_number, category, owner_position_id, status (draft, consultation, adopted, under_review, superseded, rescinded), adopted_date, review_cycle_months, next_review_date, version, supersedes_id, body_storage_path
- policy_ack_requirements: policy_id, scope (all_staff, org_unit, position), scope_ref
- policy_acknowledgments: requirement_id, user_id, acknowledged_at, policy_version
- review_tasks: polymorphic (policy, delegation_instrument), due_date, assigned_position_id, status, completed_at

Key behaviours: version everything; superseding creates a new row, never edits an adopted one. Acknowledgment compliance dashboards by org unit. Exports: current delegations register (by position and by function), acknowledgment status report.

### 3.3 Module: Risk Management (Phase 2)

- risk_matrix_config: workspace_id, likelihood_levels jsonb, consequence_levels jsonb, rating_grid jsonb (default 5x5, configurable), appetite_statements jsonb
- risk_categories: workspace_id, name, parent_id
- risks: workspace_id, register (strategic, operational, project), title, description, category_id, owner_position_id, org_unit_id, cause, consequence_description, inherent_likelihood, inherent_consequence, inherent_rating (computed), residual_likelihood, residual_consequence, residual_rating (computed), status (open, monitoring, closed), next_review_date
- controls: workspace_id, title, description, control_type (preventive, detective, corrective), owner_position_id, effectiveness (effective, partially_effective, ineffective, not_assessed), last_assessed_date
- risk_controls: risk_id, control_id
- treatments: risk_id, title, description, owner_position_id, due_date, status (planned, in_progress, complete, overdue derived), completed_at
- risk_reviews: risk_id, reviewed_by, review_date, outcome_notes, ratings snapshot jsonb

Key behaviours: heatmap by register and org unit; overdue treatment and review chasing; full rating history via risk_reviews and audit_log. Audit module (findings linked to risks) is a Phase 4+ extension, table design should not preclude it.

### 3.4 Module: IP&R Corporate Planning (Phase 3)

Hierarchy follows the NSW IP&R framework:

- plans: workspace_id, plan_type (community_strategic_plan, delivery_program, operational_plan), title, period_start, period_end, status, adopted_date, version
- plan_items: plan_id, parent_item_id, item_type (theme, community_outcome, strategy, principal_activity, action, task), code (e.g. 1.2.3), title, description, responsible_position_id, org_unit_id, sort_order
- item_links: child_item_id, parent_item_id across plans (Operational Plan action links up to Delivery Program strategy links up to CSP outcome)
- measures: workspace_id, plan_item_id, title, unit, direction (higher_is_better, lower_is_better, target_band), frequency (monthly, quarterly, annual), target_value, baseline_value
- measure_entries: measure_id, period_label, period_start, period_end, value, commentary, entered_by
- progress_updates: plan_item_id, period_label, status (on_track, monitor, off_track, complete, deferred), percent_complete, commentary, submitted_by, submitted_at, approved_by, approved_at
- report_templates: workspace_id, name, template_type (quarterly_progress, annual_report_section, delivery_program_review), docx_template_storage_path, config jsonb
- report_runs: template_id, period_label, status (queued, running, complete, failed), output_storage_path, requested_by, completed_at

Key behaviours: quarterly update workflow (responsible officer drafts, manager approves, governance compiles); roll-up status logic from actions to strategies to outcomes; the report generator merges the hierarchy, progress updates, and measures into a council-branded Word document. This generator is the flagship feature; budget integration with Meridian is a recorded future option, not in scope.

### 3.5 Cross-cutting (Phase 4)

- notifications: user_id, type, entity ref, due_date, sent_at, channel
- reminder rules: policy reviews, delegation acknowledgments, risk reviews, treatment due dates, quarterly update windows
- Dashboards: governance compliance, risk heatmap and overdue items, IP&R quarter-at-a-glance

## 4. Design system

Identity: calm institutional confidence, distinct from Warden's Aurora UI. Working theme name: Ledger.

- Colour: ink navy #0F1B2D base, paper #F7F8FA surfaces, accent teal #0E7C7B for primary actions, amber #C77D1F for monitor/warning states, deep red #A63D40 for off-track/overdue, eucalyptus green #3E7C59 for on-track. Status colours must pass WCAG AA on their surfaces.
- Type: Inter for UI, Source Serif 4 for report previews and document headings. Dense data tables at 13px, comfortable line height.
- Layout: left rail navigation grouped by module; persistent workspace switcher; every register screen is a filterable TanStack table with saved views; every entity has a detail drawer before a full page.
- Tone of UI copy: plain, statutory-aware, no exclamation marks.
- Empty states teach the framework (e.g. the delegations empty state explains s 377 and s 378 in one sentence with a "create instrument" action).

## 5. Phase plan

- Phase 0 (scaffold): repo, Supabase local, migrations for core/tenancy, auth, RLS baseline, seed script, test accounts with single-click dev login buttons, app shell and navigation. Exit: all six roles can log in and see an empty workspace.
- Phase 1 (Delegations and Policies): full 3.2. Exit: PMHC-shaped demo with a GM sub-delegation instrument, 30 sample delegations, acknowledgment flow end to end, registers exportable to CSV.
- Phase 2 (Risk): full 3.3. Exit: strategic and operational registers, configurable matrix, heatmap, treatment tracking with overdue states.
- Phase 3 (IP&R): full 3.4. Exit: seeded CSP/DP/OP hierarchy, quarterly update workflow, one-click quarterly progress report as branded .docx.
- Phase 4 (cross-cutting): reminders engine, dashboards, PDF worker, performance pass, pilot hardening.

## 6. Decisions log

- 2026-06-10: Build in Claude Code on the Beacon-pattern stack, not Lovable. Lovable optionally used later for a throwaway stakeholder demo only.
- 2026-06-10: Delegations attach to positions, never users. Acknowledgments re-trigger on occupant or version change.
- 2026-06-10: Word (.docx) generation first; PDF via worker deferred to Phase 4.
- 2026-06-10: Talent suite explicitly out of scope until GRC and IP&R phases are complete.
- 2026-06-10: Working product name Cadence; theme name Ledger. Revisit naming before any external demo.
- 2026-06-10: Dev database is a hosted Supabase project (ref tineprlidexuqcptasja, ap-southeast-2, AUD ~$10/month) because the dev environment has no Docker for the local CLI stack. Migrations still live in supabase/migrations and apply cleanly to a local stack when Docker is available. Hosted GA Postgres is 17, not 18; revisit when the Beacon deployment is built.
- 2026-06-10: Audit logging is implemented as a generic write_audit() trigger (security definer) attached per table, with an action of create, update, status_change or delete, plus a block_mutation() trigger making audit_log append-only at the database level independent of RLS and grants.
- 2026-06-10: Profile data joins use explicit duplicate foreign keys to public.profiles (alongside the auth.users keys) so PostgREST can embed display names; embed hint syntax is profiles!user_id(...).
- 2026-06-10: shadcn/ui initialised with the base-nova preset (Base UI primitives, not Radix). Base UI components have no asChild prop; use render props or handlers instead.
- 2026-06-10: Quick-login buttons are gated by build-time NEXT_PUBLIC_ENV checks and verified compiled out of production bundles by grepping .next/static for the test account strings.
- 2026-06-10: Environment split: the hosted Supabase project (tineprlidexuqcptasja) is the shared dev and demo environment; all automated tests (Vitest and Playwright) run exclusively against the local CLI stack via .env.test, with guards that refuse to run against a non-local URL. supabase/seed.sql is the canonical idempotent seed, applied automatically by supabase db reset and runnable against hosted; scripts/seed.ts remains the admin-API alternative for base accounts.
- 2026-06-10: Legislative reference data (legislative_instruments, legislative_provisions) is global: no workspace_id, read-only to authenticated, seeded by service role. Recorded exception to the every-table-carries-workspace_id rule; NSW statutes are identical for every council.
- 2026-06-10: Version lineage uses family_id plus supersedes_id on delegation_instruments and policies. Partial unique indexes enforce at most one in-force and one open draft per family. An archived status exists for abandoned drafts because hard deletes are prohibited.
- 2026-06-10: Delegation acknowledgments key on (delegation_assignment_id, position_assignment_id); policy acknowledgments on (requirement_id, user_id) with requirements copied per version. Supersede copies child rows, so re-acknowledgement on version or occupant change is structural rather than computed. instrument_version and policy_version on ack rows are server-derived snapshots for reporting, not key components.
- 2026-06-10: Acknowledgment rows are readable by all workspace members (not just governance): the security-invoker register views must be truthful for every role, and within one council ack status is register-grade compliance metadata. Acks are append-only via block_mutation triggers.
- 2026-06-10: Post-adoption immutability is trigger-enforced (jsonb diff) on instruments, policies and their children, with two carve-outs: delegation assignments may be revoked (status plus effective_to) under an adopted instrument, and policies allow owner_position_id and next_review_date changes while in force (administrative transfer and review completion).
- 2026-06-10: Policy supersession is permitted directly from under_review as well as adopted: a review concluding a rewrite flows straight into drafting the successor, and the current policy stays in force until the successor is adopted.
- 2026-06-10: policy state machine: draft <-> consultation -> adopted -> under_review -> adopted; supersede from adopted or under_review; rescind from adopted or under_review; archive for pre-adoption drafts. Adoption computes next_review_date and auto-opens a review task assigned to the owner position.
- 2026-06-10: all_staff acknowledgement scope means every active member except read_only.
- 2026-06-10: CSV exports prepend a UTF-8 BOM and quote per RFC 4180 (Excel-bound), generated server-side from flat security-invoker views through the user's own client so RLS applies to exports identically to screens.
- 2026-06-10: Table and column identifiers use the spec's US spelling (acknowledgments); UI copy uses Australian English (acknowledgement).

## 7. Progress

- 2026-06-10: Project initiated. CLAUDE.md and this file drafted. No code yet.
- 2026-06-10: Phase 1 complete. Migrations 0007 to 0013: global legislative reference (10 NSW acts, 29 provisions), delegation instruments with family lineage and state-machine triggers, delegations with provision links and position assignments, append-only acknowledgments with occupancy-keyed uniqueness, supersede and adopt RPCs with deep copy, register and pending-ack and compliance views (all security invoker), policies with the full lifecycle, ack requirements with scope expansion views, review tasks with auto-open on adoption, and the policy-documents storage bucket. UI: instruments list and detail with draft editing (provision picker, position assignment), adopt and supersede and archive flows, filterable register with by-position and by-function CSV export (UTF-8 BOM, RFC 4180), my-delegations and my-policies acknowledgement pages, policy register and detail (lifecycle actions, requirements editor, compliance by org unit, version history, document upload), reviews page, dashboard pending-ack banner and compliance table. Seed: Council-to-GM instrument (5 delegations) and GM-to-staff instrument (30 delegations) both adopted, 8 policies in mixed lifecycle states, acks seeded for all role accounts except staff (left pending for demo). 31 Vitest tests (RLS denial paths, lifecycle, supersede copy semantics, ack predicates) and Playwright e2e suite run against the local stack only; supabase db reset replays 0001 to 0013 plus seed cleanly from zero. Hosted demo project carries identical schema and seed.
- 2026-06-10: Phase 0 complete. Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui scaffold; six numbered migrations (core tenancy, org structure, append-only audit log with generic triggers, attachments and comments, profile FKs, function hardening) applied to the hosted dev project; RLS on every table via security definer membership helpers; seeded Casuarina Shire Council workspace with five org units, six positions, and the six role test accounts with position assignments; Supabase SSR auth with middleware session refresh; login page with dev-only quick-login buttons; Ledger-themed app shell with left rail nav, workspace switcher, user menu; dashboard, module placeholder pages with teaching empty states, audit log viewer, organisation and members pages. 14 Vitest RLS policy tests and 3 Playwright e2e tests pass; all six roles verified logging in against the live project; production build verified free of test credentials. Supabase security advisors clean apart from the leaked-password-protection auth setting (dashboard toggle, not SQL).

## 8. Testing notes and bring-back items

- Verify RLS denial paths with the readonly@test.local and staff@test.local accounts for every new table, not just the happy path.
- Watch the Beacon gotchas during first deploy: BYPASSRLS on service_role, raw HMAC JWT secret, aud='' on seeded auth users.
- Pilot data idea: load PMHC's published Operational Plan structure from the public website as realistic seed data for the IP&R module demo.
- Resolved 2026-06-10: NSW provision pack seeded (LGA 1993, LG Regulation 2021, EP&A Act, POEO Act, Roads Act, Crown Land Management Act, Companion Animals Act, Food Act, Impounding Act, GIPA Act).
- Open question (recorded 2026-06-10, do not build yet): sub-delegations should eventually link to the parent council-to-GM delegation they flow from (nullable source_delegation_id on delegations) for s 378 chain traceability.
- Open question: single workspace per council vs sub-workspaces for entities like s 355 committees. Park until a real requirement appears.
- Phase 0 testing notes: RLS denial paths covered in tests/rls.test.ts for staff and readonly on org_units, positions, memberships, audit_log and profiles; hard deletes verified blocked even for admin; audit_log verified immutable (no insert, update or delete via API). Rerun npm test after every policy change.
- The hosted dev project means RLS tests hit a live shared database; test artifacts accumulate (RLS-TEST org units, soft-deleted) because hard deletes are denied by design. Periodically reset via a fresh seed if noise builds up.
- Enable leaked password protection in the Supabase dashboard (Auth settings) before any external-facing deployment; it is a dashboard toggle, not configurable via SQL migration.
- SUPABASE_SERVICE_ROLE_KEY is not set in .env.local (the MCP connection does not expose it). npm run seed needs it; fetch from the Supabase dashboard if reseeding. The initial seed was applied directly via SQL.
- Quick-login e2e flow verified with Playwright chromium; this environment needed the ubuntu24.04 fallback browser build.
- Phase 1 testing notes: run supabase db reset before a full e2e pass; the ack-flow tests consume the staff account's pending acknowledgements. Vitest fixtures create their own instruments and policies, so the suite is rerunnable without reset, but rows accumulate locally (reset clears them). Playwright dev-server cold compiles can exceed 30 seconds; the config carries a 120 second test timeout for that reason.
- Postgres CTE pitfall hit during Phase 1: rows inserted by a data-modifying CTE are invisible to triggers fired by later inserts in the same statement. The supersede RPC copies children with sequential statements in a loop for this reason; keep that pattern for future deep-copy RPCs.
- The advisors' standing warnings remain the three intentionally member-callable security definer RLS helpers and the leaked-password-protection dashboard toggle. No new warnings after Phase 1 objects.
