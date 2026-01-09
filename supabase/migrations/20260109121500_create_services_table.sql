-- Migration: create services table
-- Generated: 2026-01-09

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  description text,
  price numeric(12,2) not null default 0,
  unit text default 'service',
  duration_minutes integer,
  category_id uuid,
  taxable boolean default true,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists services_name_idx on public.services (lower(name));

-- trigger to update updated_at on row update
create or replace function public.trigger_set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists services_set_timestamp on public.services;
create trigger services_set_timestamp
before update on public.services
for each row
execute procedure public.trigger_set_timestamp();
