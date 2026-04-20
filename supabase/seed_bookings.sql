-- =============================================================
-- Snips — seed bookings for today so the admin dashboard has data
-- Depends on seed.sql having been run first (shop, barber, chair, services).
-- Safe to re-run (all inserts use ON CONFLICT DO NOTHING with fixed UUIDs).
-- =============================================================

do $$
declare
  v_shop_id   uuid := 'a1000000-0000-0000-0000-000000000001';
  v_barber_id uuid := 'a2000000-0000-0000-0000-000000000001';
  v_chair_id  uuid := 'a3000000-0000-0000-0000-000000000001';

  -- Fixed customer UUIDs
  v_cust1 uuid := 'b1000000-0000-0000-0000-000000000001';
  v_cust2 uuid := 'b1000000-0000-0000-0000-000000000002';
  v_cust3 uuid := 'b1000000-0000-0000-0000-000000000003';
  v_cust4 uuid := 'b1000000-0000-0000-0000-000000000004';
  v_cust5 uuid := 'b1000000-0000-0000-0000-000000000005';

  -- Fixed booking UUIDs
  v_book1 uuid := 'c1000000-0000-0000-0000-000000000001';
  v_book2 uuid := 'c1000000-0000-0000-0000-000000000002';
  v_book3 uuid := 'c1000000-0000-0000-0000-000000000003';
  v_book4 uuid := 'c1000000-0000-0000-0000-000000000004';
  v_book5 uuid := 'c1000000-0000-0000-0000-000000000005';
  v_book6 uuid := 'c1000000-0000-0000-0000-000000000006';
  v_book7 uuid := 'c1000000-0000-0000-0000-000000000007';
  v_book8 uuid := 'c1000000-0000-0000-0000-000000000008';

  -- Service IDs (looked up by name — not fixed UUIDs in base seed)
  v_svc_fade     uuid;
  v_svc_beard    uuid;
  v_svc_cutbeard uuid;

  -- Today in London time — handles DST automatically
  v_today date := (now() AT TIME ZONE 'Europe/London')::date;
begin

  select id into v_svc_fade     from public.services where shop_id = v_shop_id and name = 'Skin Fade'   limit 1;
  select id into v_svc_beard    from public.services where shop_id = v_shop_id and name = 'Beard Trim'  limit 1;
  select id into v_svc_cutbeard from public.services where shop_id = v_shop_id and name = 'Cut & Beard' limit 1;

  -- -------------------------
  -- Customers (guests, no auth user required)
  -- -------------------------
  insert into public.customers (id, shop_id, first_name, last_name, email, is_guest)
  values
    (v_cust1, v_shop_id, 'James',  'Thornton', 'james.thornton@example.com', true),
    (v_cust2, v_shop_id, 'Ravi',   'Patel',    'ravi.patel@example.com',     true),
    (v_cust3, v_shop_id, 'Marcus', 'Webb',     'marcus.webb@example.com',    true),
    (v_cust4, v_shop_id, 'Oliver', 'Crane',    'oliver.crane@example.com',   true),
    (v_cust5, v_shop_id, 'Danny',  'Ford',     'danny.ford@example.com',     true)
  on conflict (id) do nothing;

  -- -------------------------
  -- Bookings spread across today in various states
  -- AT TIME ZONE 'Europe/London' resolves the correct UTC offset (BST/GMT) automatically
  -- -------------------------

  -- 09:00 — completed (Skin Fade, 30 min)
  insert into public.bookings (id, shop_id, customer_id, barber_id, chair_id, service_id, status, start_at, end_at)
  values (v_book1, v_shop_id, v_cust1, v_barber_id, v_chair_id, v_svc_fade, 'completed',
    (v_today + time '09:00') AT TIME ZONE 'Europe/London',
    (v_today + time '09:30') AT TIME ZONE 'Europe/London')
  on conflict (id) do nothing;

  -- 09:30 — completed (Beard Trim, 15 min)
  insert into public.bookings (id, shop_id, customer_id, barber_id, chair_id, service_id, status, start_at, end_at)
  values (v_book2, v_shop_id, v_cust2, v_barber_id, v_chair_id, v_svc_beard, 'completed',
    (v_today + time '09:30') AT TIME ZONE 'Europe/London',
    (v_today + time '09:45') AT TIME ZONE 'Europe/London')
  on conflict (id) do nothing;

  -- 10:00 — accepted (Cut & Beard, 45 min)
  insert into public.bookings (id, shop_id, customer_id, barber_id, chair_id, service_id, status, start_at, end_at)
  values (v_book3, v_shop_id, v_cust3, v_barber_id, v_chair_id, v_svc_cutbeard, 'accepted',
    (v_today + time '10:00') AT TIME ZONE 'Europe/London',
    (v_today + time '10:45') AT TIME ZONE 'Europe/London')
  on conflict (id) do nothing;

  -- 11:00 — pending, recent (Skin Fade, 30 min) — won't appear in "needs attention"
  insert into public.bookings (id, shop_id, customer_id, barber_id, chair_id, service_id, status, start_at, end_at)
  values (v_book4, v_shop_id, v_cust4, v_barber_id, v_chair_id, v_svc_fade, 'pending',
    (v_today + time '11:00') AT TIME ZONE 'Europe/London',
    (v_today + time '11:30') AT TIME ZONE 'Europe/London')
  on conflict (id) do nothing;

  -- 12:00 — pending, created 3 hours ago (Cut & Beard, 45 min) — WILL appear in "needs attention"
  insert into public.bookings (id, shop_id, customer_id, barber_id, chair_id, service_id, status, start_at, end_at, created_at)
  values (v_book5, v_shop_id, v_cust5, v_barber_id, v_chair_id, v_svc_cutbeard, 'pending',
    (v_today + time '12:00') AT TIME ZONE 'Europe/London',
    (v_today + time '12:45') AT TIME ZONE 'Europe/London',
    now() - interval '3 hours')
  on conflict (id) do nothing;

  -- 13:00 — cancelled (Beard Trim, 15 min)
  insert into public.bookings (id, shop_id, customer_id, barber_id, chair_id, service_id, status, start_at, end_at, cancellation_reason)
  values (v_book6, v_shop_id, v_cust1, v_barber_id, v_chair_id, v_svc_beard, 'cancelled',
    (v_today + time '13:00') AT TIME ZONE 'Europe/London',
    (v_today + time '13:15') AT TIME ZONE 'Europe/London',
    'Customer cancelled via app')
  on conflict (id) do nothing;

  -- 14:00 — no_show (Skin Fade, 30 min)
  insert into public.bookings (id, shop_id, customer_id, barber_id, chair_id, service_id, status, start_at, end_at)
  values (v_book7, v_shop_id, v_cust2, v_barber_id, v_chair_id, v_svc_fade, 'no_show',
    (v_today + time '14:00') AT TIME ZONE 'Europe/London',
    (v_today + time '14:30') AT TIME ZONE 'Europe/London')
  on conflict (id) do nothing;

  -- 15:00 — accepted, upcoming (Skin Fade, 30 min)
  insert into public.bookings (id, shop_id, customer_id, barber_id, chair_id, service_id, status, start_at, end_at)
  values (v_book8, v_shop_id, v_cust3, v_barber_id, v_chair_id, v_svc_fade, 'accepted',
    (v_today + time '15:00') AT TIME ZONE 'Europe/London',
    (v_today + time '15:30') AT TIME ZONE 'Europe/London')
  on conflict (id) do nothing;

end $$;
