create table public.barbers (
  id          uuid primary key default uuid_generate_v4(),
  shop_id     uuid references public.shops(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete set null,
  name        text not null,
  email       text,
  phone       text,
  avatar_url  text,
  is_active   boolean not null default true
);

create index on public.barbers (shop_id);

create table public.chairs (
  id          uuid primary key default uuid_generate_v4(),
  shop_id     uuid references public.shops(id) on delete cascade not null,
  barber_id   uuid references public.barbers(id) on delete set null,
  label       text not null,
  is_active   boolean not null default true
);

create index on public.chairs (shop_id);