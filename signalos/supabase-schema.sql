-- SignalOS Dispatch — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- 1. Officers table
create table if not exists officers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text not null,
  officer_id text not null unique,
  status     text not null default 'available'
             check (status in ('available', 'busy', 'critical', 'unavailable')),
  location   text not null default '',
  lat        double precision not null default 0,
  lng        double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger officers_updated_at
  before update on officers
  for each row
  execute function update_updated_at();

-- 3. Enable real-time (so the frontend gets live updates)
alter publication supabase_realtime add table officers;

-- 4. Row-level security (allow public read, authenticated write)
alter table officers enable row level security;

create policy "Allow public read" on officers
  for select using (true);

create policy "Allow authenticated insert" on officers
  for insert with check (true);

create policy "Allow authenticated update" on officers
  for update using (true);

create policy "Allow authenticated delete" on officers
  for delete using (true);

-- 5. Seed data (UCLA area coordinates)
insert into officers (name, code, officer_id, status, location, lat, lng) values
  ('Jenson Button',    'SFPO', '12345678', 'available',   '1250 Wilshire Blvd, Los Angeles',        34.0625, -118.4490),
  ('Maxwell Carter',   'ABCD', '98765432', 'busy',        '4500 Sunset Blvd, Los Angeles',           34.0736, -118.4516),
  ('Oliver King',      'EFGH', '24681357', 'critical',    '3200 W 6th St, Los Angeles',              34.0660, -118.4370),
  ('Liam Thompson',    'IJKL', '13579246', 'busy',        '2100 S La Cienega Blvd, Los Angeles',     34.0755, -118.4405),
  ('Ethan Parker',     'MNOP', '86420975', 'unavailable', '1500 N Vine St, Los Angeles',             34.0700, -118.4460);
