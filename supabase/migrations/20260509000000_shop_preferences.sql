-- =============================================
-- shop_preferences
-- One row per shop. Stores booking behaviour settings
-- previously held as columns on the shops table.
-- =============================================
create table public.shop_preferences (
  id                  uuid        primary key default gen_random_uuid(),
  shop_id             uuid        not null unique references public.shops(id) on delete cascade,
  auto_accept         boolean     not null default false,
  booking_window_days integer     not null default 30,
  buffer_minutes      integer     not null default 0,
  deposit_required    boolean     not null default false,
  show_shop_page      boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- =============================================
-- shop_display_settings
-- One row per shop. Stores optional info panel settings
-- for the public-facing booking page.
-- =============================================
create table public.shop_display_settings (
  id                    uuid        primary key default gen_random_uuid(),
  shop_id               uuid        not null unique references public.shops(id) on delete cascade,
  info_panel_enabled    boolean     not null default false,
  info_panel_message    text,
  info_panel_expires_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- =============================================
-- services: add per-service deposit amount
-- =============================================
alter table public.services
  add column deposit_amount_pence integer
    constraint services_deposit_amount_pence_check check (deposit_amount_pence >= 0);

-- =============================================
-- Migrate existing shop data → shop_preferences
-- booking_window_days default was 28; new default is 30
-- but we preserve the actual stored value here.
-- =============================================
insert into public.shop_preferences (shop_id, auto_accept, booking_window_days, buffer_minutes)
select id, auto_accept, booking_window_days, buffer_minutes
from public.shops;

-- =============================================
-- Insert default shop_display_settings for all existing shops
-- =============================================
insert into public.shop_display_settings (shop_id)
select id from public.shops;

-- =============================================
-- Drop migrated / relocated columns from shops
-- =============================================
alter table public.shops
  drop column if exists auto_accept,
  drop column if exists booking_window_days,
  drop column if exists buffer_minutes,
  drop column if exists logo_url,
  drop column if exists brand_colour;

-- =============================================
-- Trigger: auto-create preference rows for new shops
-- =============================================
create or replace function public.create_shop_defaults()
returns trigger as $$
begin
  insert into public.shop_preferences (shop_id) values (new.id);
  insert into public.shop_display_settings (shop_id) values (new.id);
  return new;
end;
$$ language plpgsql;

create trigger trigger_create_shop_defaults
  after insert on public.shops
  for each row execute function public.create_shop_defaults();

-- =============================================
-- RLS — shop_preferences
-- Service role bypasses RLS automatically (used by Edge Functions).
-- =============================================
alter table public.shop_preferences enable row level security;

create policy "Owners can manage their shop preferences"
  on public.shop_preferences for all
  using (public.is_shop_owner(shop_id));

-- =============================================
-- RLS — shop_display_settings
-- Service role bypasses RLS automatically (used by Edge Functions).
-- =============================================
alter table public.shop_display_settings enable row level security;

create policy "Owners can manage their shop display settings"
  on public.shop_display_settings for all
  using (public.is_shop_owner(shop_id));

-- =============================================
-- updated_at triggers — reuses handle_updated_at()
-- defined in 20260418000000_create_client_branding.sql
-- =============================================
create trigger set_shop_preferences_updated_at
  before update on public.shop_preferences
  for each row execute function public.handle_updated_at();

create trigger set_shop_display_settings_updated_at
  before update on public.shop_display_settings
  for each row execute function public.handle_updated_at();
