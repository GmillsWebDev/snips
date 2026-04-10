-- Waitlist
create table public.waitlist (
  id             uuid primary key default uuid_generate_v4(),
  shop_id        uuid references public.shops(id) on delete cascade not null,
  customer_id    uuid references public.customers(id) on delete cascade not null,
  service_id     uuid references public.services(id) on delete cascade not null,
  barber_id      uuid references public.barbers(id) on delete set null,
  preferred_date date not null,
  notified_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index on public.waitlist (shop_id);

-- Reviews
create table public.reviews (
  id           uuid primary key default uuid_generate_v4(),
  booking_id   uuid references public.bookings(id) on delete cascade not null unique,
  customer_id  uuid references public.customers(id) on delete cascade not null,
  rating       int not null check (rating between 1 and 5),
  comment      text,
  is_visible   boolean not null default true,
  created_at   timestamptz not null default now()
);

create index on public.reviews (booking_id);

-- Notification log
create table public.notification_log (
  id               uuid primary key default uuid_generate_v4(),
  booking_id       uuid references public.bookings(id) on delete cascade not null,
  type             text not null check (type in ('confirmation','reminder','accepted','rejected','cancelled','waitlist','review_invite')),
  channel          text not null check (channel in ('email','sms','whatsapp')),
  sent_at          timestamptz not null default now(),
  brevo_message_id text,
  status           text not null check (status in ('sent','failed','bounced'))
);

create index on public.notification_log (booking_id);

-- Discount codes
create table public.discount_codes (
  id          uuid primary key default uuid_generate_v4(),
  shop_id     uuid references public.shops(id) on delete cascade not null,
  code        text not null unique,
  type        text not null check (type in ('percent','fixed_pence')),
  value       int not null,
  max_uses    int,
  uses_count  int not null default 0,
  expires_at  timestamptz,
  is_active   boolean not null default true
);

create index on public.discount_codes (shop_id);
create index on public.discount_codes (code);

-- User roles
create table public.user_roles (
  id       uuid primary key default uuid_generate_v4(),
  user_id  uuid references auth.users(id) on delete cascade not null,
  shop_id  uuid references public.shops(id) on delete cascade not null,
  role     text not null check (role in ('owner','barber','receptionist')),
  unique (user_id, shop_id)
);

create index on public.user_roles (user_id);
create index on public.user_roles (shop_id);