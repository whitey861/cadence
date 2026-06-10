# Cadence

Governance, risk, compliance and corporate planning for Australian local government. An Adevus product.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL, keys and TEST_PASSWORD
npm run dev
```

With Docker available you can run the full local stack instead:

```bash
supabase start
supabase db reset            # applies migrations in supabase/migrations
npm run seed                 # reference data and test accounts
```

## Commands

- `npm run dev` local app on http://localhost:3000
- `npm run seed` seed base accounts via the auth admin API (hosted)
- `npm run seed:local` same, against the local stack (.env.test)
- `npm run gen:types` regenerate Supabase TypeScript types after a migration
- `npm test` Vitest unit, RLS policy and lifecycle tests (local stack only)
- `npm run test:e2e` Playwright end-to-end tests (local stack only; run `supabase db reset` first)

`supabase db reset` replays all migrations and `supabase/seed.sql`, the canonical idempotent demo seed (Casuarina Shire Council, NSW legislative provision pack, two adopted delegation instruments, eight policies). Tests are guarded: they refuse to run against anything other than the local stack, because the hosted project is the shared dev and demo environment.

## Test accounts

One per role: admin, governance, risk, manager, staff and readonly, all `@test.local`, password from `TEST_PASSWORD`. The login page shows single-click buttons for these accounts in development and staging builds only; they are compiled out of production bundles.

## Project documentation

- `CLAUDE.md` conventions and working rules
- `CADENCE.md` living spec: entities, design system, decisions and progress
