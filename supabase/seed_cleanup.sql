-- =============================================================
-- Snips — cleanup script to undo seed.sql
-- Run this in the Supabase SQL Editor when done testing.
-- Safe to run multiple times (deletes by fixed UUID, no-ops if already gone).
-- =============================================================

do $$
declare
  v_user_id   uuid := 'bddb8719-2b9a-40f6-8a15-e792ddb51cbd';
  v_shop_id   uuid := 'a1000000-0000-0000-0000-000000000001';
  v_barber_id uuid := 'a2000000-0000-0000-0000-000000000001';
  v_chair_id  uuid := 'a3000000-0000-0000-0000-000000000001';
begin

  -- Delete in reverse dependency order

  delete from public.client_branding
    where shop_id = v_shop_id;

  delete from public.user_roles
    where user_id = v_user_id and shop_id = v_shop_id;

  delete from public.availability_rules
    where barber_id = v_barber_id;

  delete from public.services
    where shop_id = v_shop_id;

  delete from public.chairs
    where id = v_chair_id;

  delete from public.barbers
    where id = v_barber_id;

  delete from public.shops
    where id = v_shop_id;

end $$;
