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
- `npm run seed` seed reference data and the six role test accounts
- `npm run gen:types` regenerate Supabase TypeScript types after a migration
- `npm test` Vitest unit and RLS policy tests
- `npm run test:e2e` Playwright end-to-end tests

## Test accounts

One per role: admin, governance, risk, manager, staff and readonly, all `@test.local`, password from `TEST_PASSWORD`. The login page shows single-click buttons for these accounts in development and staging builds only; they are compiled out of production bundles.

## Project documentation

- `CLAUDE.md` conventions and working rules
- `CADENCE.md` living spec: entities, design system, decisions and progress
