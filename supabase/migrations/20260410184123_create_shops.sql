create table public.shops (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid references auth.users(id) on delete cascade not null,
  name                text not null,
  slug                text unique not null,
  plan_type           text not null default 'solo' check (plan_type in ('solo', 'multi')),
  auto_accept         boolean not null default false,
  booking_window_days int not null default 28,
  buffer_minutes      int not null default 0,
  timezone            text not null default 'Europe/London',
  logo_url            text,
  brand_colour        text default '#000000',
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

create index on public.shops (owner_id);
create index on public.shops (slug);