-- =============================================
-- client_branding: add color_on_primary and color_on_secondary,
-- add hex check constraints on all four colour columns,
-- extend create_shop_defaults trigger to seed client_branding.
-- =============================================

-- 1. New columns
alter table public.client_branding
  add column color_on_primary   text not null default '#ffffff',
  add column color_on_secondary text not null default '#ffffff';

-- 2. Check constraints on the new columns (no prior constraint — add directly)
alter table public.client_branding
  add constraint client_branding_color_on_primary_check
    check (color_on_primary ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'),
  add constraint client_branding_color_on_secondary_check
    check (color_on_secondary ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$');

-- Check constraints on existing columns, guarded against re-application
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname    = 'client_branding_color_primary_check'
      and conrelid   = 'public.client_branding'::regclass
  ) then
    alter table public.client_branding
      add constraint client_branding_color_primary_check
        check (color_primary ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname    = 'client_branding_color_secondary_check'
      and conrelid   = 'public.client_branding'::regclass
  ) then
    alter table public.client_branding
      add constraint client_branding_color_secondary_check
        check (color_secondary ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$');
  end if;
end;
$$;

-- 3. Extend create_shop_defaults to seed client_branding for every new shop
create or replace function public.create_shop_defaults()
returns trigger as $$
begin
  insert into public.shop_preferences (shop_id) values (new.id);
  insert into public.shop_display_settings (shop_id) values (new.id);
  insert into public.client_branding (shop_id, color_primary, color_secondary, color_on_primary, color_on_secondary)
    values (new.id, '#2d5a27', '#8e4432', '#ffffff', '#ffffff');
  return new;
end;
$$ language plpgsql;

-- 4. Backfill client_branding for snips-test shop if not already present
insert into public.client_branding (shop_id, color_primary, color_secondary, color_on_primary, color_on_secondary)
select id, '#ff0000', '#1f921f', '#ffffff', '#ffffff'
from public.shops
where slug = 'snips-test'
  and not exists (
    select 1 from public.client_branding
    where client_branding.shop_id = shops.id
  );
