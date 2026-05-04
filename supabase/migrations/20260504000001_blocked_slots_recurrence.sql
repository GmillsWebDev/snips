create type recurrence_pattern as enum (
  'none',
  'daily',
  'weekly',
  'fortnightly',
  'monthly'
);

alter table public.blocked_slots
  add column recurrence_pattern  recurrence_pattern  not null default 'none',
  add column recurrence_id       uuid,
  add column recurrence_end_date date,
  add column generated_until     date;

create index if not exists idx_blocked_slots_recurrence_id
  on public.blocked_slots (recurrence_id);

create index if not exists idx_blocked_slots_start_at
  on public.blocked_slots (start_at);
