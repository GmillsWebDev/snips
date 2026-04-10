create table public.customers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  shop_id        uuid references public.shops(id) on delete cascade not null,
  name           text not null,
  email          text not null,
  phone          text,
  is_guest       boolean not null default false,
  loyalty_points int not null default 0,
  notes          text,
  created_at     timestamptz not null default now()
);

create index on public.customers (shop_id);
create index on public.customers (user_id);
create index on public.customers (email);