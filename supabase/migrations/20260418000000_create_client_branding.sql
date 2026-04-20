-- Shared trigger function — sets updated_at to now() on any update.
-- Defined here for use by client_branding and any future tables.
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =============================================
-- client_branding — per-shop visual identity
-- One row per shop. All fields are optional
-- except color_primary which has a safe default.
-- =============================================

create table public.client_branding (
  id               uuid        primary key default gen_random_uuid(),
  shop_id          uuid        not null references public.shops(id) on delete cascade,
  color_primary    text        not null default '#ff0000',
  color_secondary  text        not null default '#1f921f',
  font_heading     text,
  font_body        text,
  logo_url         text,
  favicon_url      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (shop_id)
);

-- Keep updated_at current automatically
create trigger set_client_branding_updated_at
  before update on public.client_branding
  for each row execute function public.handle_updated_at();

-- =====================
-- RLS
-- =====================
alter table public.client_branding enable row level security;

-- Anyone can read branding (needed for public booking pages)
create policy "Anyone can view shop branding"
  on public.client_branding for select
  using (true);

-- Only the shop owner can create or change branding
create policy "Owners can manage their shop branding"
  on public.client_branding for all
  using (public.is_shop_owner(shop_id));
