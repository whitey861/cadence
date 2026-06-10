-- Phase 1: legislative reference data.
-- Global, not tenant data: NSW statutes are identical for every council, so these
-- two tables deliberately carry no workspace_id (recorded exception to the
-- every-table-carries-workspace_id rule). Read-only to clients; seeded by service role.

create table public.legislative_instruments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  jurisdiction text not null default 'NSW',
  source_url text,
  created_at timestamptz not null default now()
);

create table public.legislative_provisions (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references public.legislative_instruments (id) on delete cascade,
  reference text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (instrument_id, reference)
);

create index legislative_provisions_instrument_idx on public.legislative_provisions (instrument_id);

alter table public.legislative_instruments enable row level security;
alter table public.legislative_provisions enable row level security;

create policy legislative_instruments_select on public.legislative_instruments
  for select to authenticated
  using (true);

create policy legislative_provisions_select on public.legislative_provisions
  for select to authenticated
  using (true);

-- No client write policies: provision packs are maintained via seed scripts.
