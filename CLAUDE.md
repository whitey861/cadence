# CLAUDE.md - Cadence

Cadence is an Adevus product: a governance, risk, compliance and corporate planning platform for Australian local government. It is a modern replacement for Pulse Software's Governance suite, built for councils that need delegations management, enterprise risk, policy lifecycle, and IP&R statutory planning and reporting.

Reference customer shape: a NSW council of 600 to 1,200 staff operating under the Local Government Act 1993 and the Integrated Planning and Reporting (IP&R) framework.

## Working rules

- Never use em dashes in any code comments, UI copy, documentation, or generated reports. Use commas, colons, or restructured sentences.
- Australian English everywhere: organisation, prioritise, licence (noun), program (for Delivery Program, per IP&R convention).
- Read CADENCE.md (living project file) at the start of every session. Update its Progress and Decisions sections at the end of every session. Never put testing notes in this file; they belong in CADENCE.md.
- All dates are stored UTC, displayed in Australia/Sydney.
- Every table change goes through a numbered SQL migration in supabase/migrations. Never mutate schema ad hoc.
- Append-only audit logging is mandatory on all governance records (delegations, policies, risks, plan items). No hard deletes on these entities; use status transitions and soft delete.

## Stack

- Next.js 15 (App Router) + TypeScript, Tailwind CSS, shadcn/ui
- Supabase (Postgres 18, GoTrue auth, PostgREST, Storage), self-hosted per the Beacon pattern: ECS Fargate services behind nginx, Cloud Map internal DNS, RDS PostgreSQL
- Local dev: Supabase CLI local stack; deploy target is the Adevus AWS organisation (ap-southeast-2)
- Document generation: `docx` npm package for Word output; PDF conversion deferred to a worker service (Phase 4)
- Charts: recharts. Tables: TanStack Table. Forms: react-hook-form + zod.

## Beacon-pattern gotchas (carry these over, they cost days last time)

- service_role must have BYPASSRLS.
- PostgREST JWT secret is the raw HMAC string, no `d:` prefix.
- GoTrue v2 requires `aud = ''` on auth.users rows created by seed scripts.
- Edge/server internal calls to Supabase services use Cloud Map names in the internal namespace, never the public ALB hostname.

## Multi-tenancy and security

- Every domain table carries `workspace_id uuid not null`. One workspace per council.
- RLS on all tables. Standard policy: membership in workspace via `memberships` table, with role checks for write operations.
- Roles: `admin`, `governance_officer`, `risk_owner`, `manager`, `staff`, `read_only`. Roles live on the membership, not the user.
- Positions are first-class: delegations and policy ownership attach to positions, not people. People occupy positions via assignments with effective dates. This is the single most important modelling decision in the product; never shortcut it by attaching a delegation directly to a user.

## Test accounts (required from Phase 0)

Seed one test account per role (admin@test.local, governance@test.local, risk@test.local, manager@test.local, staff@test.local, readonly@test.local, password from .env TEST_PASSWORD). The login page must show single-click login buttons for each test account whenever NEXT_PUBLIC_ENV=development or staging. These buttons must be compiled out of production builds, not just hidden.

## Module map and build order

- Phase 0: scaffold, auth, workspaces, memberships, positions, org units, audit log, test accounts with quick login
- Phase 1: Delegations and Policies (the wedge module)
- Phase 2: Risk Management (registers, matrix, controls, treatments, reviews)
- Phase 3: IP&R Corporate Planning (CSP, Delivery Program, Operational Plan, measures, quarterly progress, Word report generation)
- Phase 4: dashboards, notifications and reminders engine, PDF worker, polish
- Later: Talent suite (HR Core, onboarding, learning and accreditations) as a separate epic, do not start without explicit instruction

Full entity definitions, design system, decisions log, and testing notes are in CADENCE.md. Treat CADENCE.md as the source of truth for spec; treat this file as the source of truth for conventions.

## Commands

- `npm run dev` local app
- `supabase start` / `supabase db reset` local stack and reseed
- `npm run seed` seed reference data and test accounts
- `npm run gen:types` regenerate Supabase TypeScript types after any migration
- `npm test` Vitest unit tests; `npm run test:e2e` Playwright

## Definition of done for any feature

1. Migration applied and types regenerated
2. RLS policies written and covered by a pgTAP or Vitest policy test
3. Audit log entries written for create, update, status change
4. Works for the relevant role test accounts and is denied for the others
5. CADENCE.md Progress and Decisions updated
