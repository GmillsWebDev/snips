create table public.availability_rules (
  id           uuid primary key default uuid_generate_v4(),
  barber_id    uuid references public.barbers(id) on delete cascade not null,
  day_of_week  int not null check (day_of_week between 0 and 6),
  start_time   time not null,
  end_time     time not null,
  is_working   boolean not null default true
);

create index on public.availability_rules (barber_id);

create table public.blocked_slots (
  id          uuid primary key default uuid_generate_v4(),
  barber_id   uuid references public.barbers(id) on delete cascade not null,
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  reason      text,
  constraint blocked_slots_order check (end_at > start_at)
);

create index on public.blocked_slots (barber_id);
create index on public.blocked_slots (start_at, end_at);