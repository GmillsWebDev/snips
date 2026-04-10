create table public.bookings (
  id                  uuid primary key default uuid_generate_v4(),
  shop_id             uuid references public.shops(id) on delete cascade not null,
  customer_id         uuid references public.customers(id) on delete restrict not null,
  barber_id           uuid references public.barbers(id) on delete restrict not null,
  chair_id            uuid references public.chairs(id) on delete restrict not null,
  service_id          uuid references public.services(id) on delete restrict not null,
  status              text not null default 'pending' check (
                        status in ('pending','accepted','rejected','cancelled','completed','no_show','expired')
                      ),
  start_at            timestamptz not null,
  end_at              timestamptz not null,
  notes               text,
  internal_notes      text,
  cancellation_reason text,
  deposit_paid_pence  int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint bookings_time_order check (end_at > start_at)
);

create index on public.bookings (shop_id);
create index on public.bookings (customer_id);
create index on public.bookings (barber_id);
create index on public.bookings (status);
create index on public.bookings (start_at);

-- Auto-update updated_at on any row change
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();