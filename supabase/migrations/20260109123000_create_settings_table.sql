-- Create settings table for key/value JSON configuration
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

create index if not exists settings_key_idx on public.settings (key);
