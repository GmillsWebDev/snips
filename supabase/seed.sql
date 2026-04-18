-- =============================================================
-- Snips — seed data for local development
-- =============================================================
-- Before running, replace the two placeholder UUIDs:
--   YOUR_USER_ID  → paste your auth.users UUID (Supabase Dashboard → Authentication → Users)
-- The same UUID is used for owner_id, barber user_id, and user_roles.
-- =============================================================

-- Use fixed UUIDs so the seed is idempotent (safe to re-run)
do $$
declare
  v_user_id     uuid := 'bddb8719-2b9a-40f6-8a15-e792ddb51cbd';   -- ← replace this
  v_shop_id     uuid := 'a1000000-0000-0000-0000-000000000001';
  v_barber_id   uuid := 'a2000000-0000-0000-0000-000000000001';
  v_chair_id    uuid := 'a3000000-0000-0000-0000-000000000001';
begin

  -- -------------------------
  -- Shop
  -- -------------------------
  insert into public.shops (id, owner_id, name, slug, plan_type, auto_accept, booking_window_days, buffer_minutes, timezone, brand_colour, is_active)
  values (
    v_shop_id,
    v_user_id,
    'Snips Barbershop',
    'snips-test',
    'solo',
    false,
    28,
    0,
    'Europe/London',
    '#0b0b92',
    true
  )
  on conflict (id) do nothing;

  -- -------------------------
  -- Barber
  -- -------------------------
  insert into public.barbers (id, shop_id, user_id, name, email, is_active)
  values (
    v_barber_id,
    v_shop_id,
    v_user_id,
    'Dave',
    'dave@snips.test',
    true
  )
  on conflict (id) do nothing;

  -- -------------------------
  -- Chair
  -- -------------------------
  insert into public.chairs (id, shop_id, barber_id, label, is_active)
  values (
    v_chair_id,
    v_shop_id,
    v_barber_id,
    'Chair 1',
    true
  )
  on conflict (id) do nothing;

  -- -------------------------
  -- Services
  -- -------------------------
  insert into public.services (shop_id, name, description, duration_minutes, price_pence, is_active, display_order)
  values
    (v_shop_id, 'Skin Fade',    'Clean skin fade, styled to finish',          30, 1500, true, 1),
    (v_shop_id, 'Beard Trim',   'Shape and tidy with straight razor finish',  15,  800, true, 2),
    (v_shop_id, 'Cut & Beard',  'Full haircut plus beard trim and tidy',      45, 2000, true, 3)
  on conflict do nothing;

  -- -------------------------
  -- Availability rules — Mon–Sat (1–6), 09:00–17:00
  -- -------------------------
  insert into public.availability_rules (barber_id, day_of_week, start_time, end_time, is_working)
  values
    (v_barber_id, 1, '09:00', '17:00', true),  -- Monday
    (v_barber_id, 2, '09:00', '17:00', true),  -- Tuesday
    (v_barber_id, 3, '09:00', '17:00', true),  -- Wednesday
    (v_barber_id, 4, '09:00', '17:00', true),  -- Thursday
    (v_barber_id, 5, '09:00', '17:00', true),  -- Friday
    (v_barber_id, 6, '09:00', '17:00', true)   -- Saturday
  on conflict do nothing;

  -- -------------------------
  -- Client branding
  -- -------------------------
  insert into public.client_branding (shop_id, color_primary, color_secondary, font_heading, font_body)
  values (v_shop_id, '#ff0000', '#1f921f', 'Inter', 'Inter')
  on conflict (shop_id) do nothing;

  -- -------------------------
  -- User role — owner
  -- -------------------------
  insert into public.user_roles (user_id, shop_id, role)
  values (v_user_id, v_shop_id, 'owner')
  on conflict (user_id, shop_id) do nothing;

end $$;
