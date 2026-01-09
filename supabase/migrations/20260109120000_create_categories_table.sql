-- Create categories table for canonical product categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  parent_id uuid references public.categories(id) on delete set null,
  created_at timestamptz default now()
);

create unique index if not exists categories_name_idx on public.categories(lower(name));
create unique index if not exists categories_slug_idx on public.categories(slug);
