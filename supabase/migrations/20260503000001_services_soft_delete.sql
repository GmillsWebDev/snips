alter table public.services
  add column created_at  timestamptz not null default now(),
  add column is_deleted  boolean     not null default false,
  add column deleted_at  timestamptz default null;

create index on public.services (shop_id, is_deleted);
