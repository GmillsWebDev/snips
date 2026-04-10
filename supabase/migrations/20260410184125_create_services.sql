create table public.services (
  id               uuid primary key default gen_random_uuid(),
  shop_id          uuid references public.shops(id) on delete cascade not null,
  name             text not null,
  description      text,
  duration_minutes int not null default 30,
  price_pence      int not null default 0,
  is_active        boolean not null default true,
  display_order    int not null default 0
);

create index on public.services (shop_id);