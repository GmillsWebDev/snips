-- =============================================================
-- Snips — June 2026 demo seed
-- 8 guest customers, 44 bookings spread across June 2026
-- Idempotent: safe to re-run (on conflict do nothing on all rows)
-- Undo: run seed_june_demo_backout.sql
-- =============================================================

do $$
declare
  v_shop_id   uuid := 'a1000000-0000-0000-0000-000000000001';
  v_barber_id uuid := 'a2000000-0000-0000-0000-000000000001';
  v_chair_id  uuid := 'a3000000-0000-0000-0000-000000000001';

  v_svc_fade  uuid;
  v_svc_beard uuid;
  v_svc_combo uuid;

  -- Customers (fixed UUIDs for idempotency)
  v_c1 uuid := 'c1000000-0000-0000-0000-000000000001'; -- James Wilson
  v_c2 uuid := 'c1000000-0000-0000-0000-000000000002'; -- Liam Brown
  v_c3 uuid := 'c1000000-0000-0000-0000-000000000003'; -- Oliver Taylor
  v_c4 uuid := 'c1000000-0000-0000-0000-000000000004'; -- Noah Davies
  v_c5 uuid := 'c1000000-0000-0000-0000-000000000005'; -- Harry Johnson
  v_c6 uuid := 'c1000000-0000-0000-0000-000000000006'; -- Jack Williams
  v_c7 uuid := 'c1000000-0000-0000-0000-000000000007'; -- George Smith
  v_c8 uuid := 'c1000000-0000-0000-0000-000000000008'; -- Charlie Jones
begin

  -- Service IDs are auto-generated so look them up by name
  select id into v_svc_fade  from public.services where shop_id = v_shop_id and name = 'Skin Fade';
  select id into v_svc_beard from public.services where shop_id = v_shop_id and name = 'Beard Trim';
  select id into v_svc_combo from public.services where shop_id = v_shop_id and name = 'Cut & Beard';

  -- ──────────────────────────────────────────────────────────────
  -- Customers — 8 guests, no auth account
  -- ──────────────────────────────────────────────────────────────
  insert into public.customers (id, shop_id, first_name, last_name, email, phone, is_guest)
  values
    (v_c1, v_shop_id, 'James',   'Wilson',   'james.wilson@demo.snips',   '07700900001', true),
    (v_c2, v_shop_id, 'Liam',    'Brown',    'liam.brown@demo.snips',     '07700900002', true),
    (v_c3, v_shop_id, 'Oliver',  'Taylor',   'oliver.taylor@demo.snips',  '07700900003', true),
    (v_c4, v_shop_id, 'Noah',    'Davies',   'noah.davies@demo.snips',    '07700900004', true),
    (v_c5, v_shop_id, 'Harry',   'Johnson',  'harry.johnson@demo.snips',  '07700900005', true),
    (v_c6, v_shop_id, 'Jack',    'Williams', 'jack.williams@demo.snips',  '07700900006', true),
    (v_c7, v_shop_id, 'George',  'Smith',    'george.smith@demo.snips',   '07700900007', true),
    (v_c8, v_shop_id, 'Charlie', 'Jones',    'charlie.jones@demo.snips',  '07700900008', true)
  on conflict (id) do nothing;

  -- ──────────────────────────────────────────────────────────────
  -- Bookings — all times Europe/London BST (+01)
  -- Past rows (Jun 1-11): completed, with a couple of cancelled
  --   and one no_show — overlap trigger skips these statuses.
  -- Today (Jun 12): accepted (morning) + pending (afternoon).
  -- Future (Jun 13-20): accepted and pending, no overlaps.
  -- ──────────────────────────────────────────────────────────────
  insert into public.bookings (id, shop_id, customer_id, barber_id, chair_id, service_id, start_at, end_at, status)
  values

  -- ── 1 Jun (Mon) ───────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000001', v_shop_id, v_c1, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-01 09:00:00+01', '2026-06-01 09:30:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000002', v_shop_id, v_c2, v_barber_id, v_chair_id, v_svc_combo, '2026-06-01 10:00:00+01', '2026-06-01 10:45:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000003', v_shop_id, v_c3, v_barber_id, v_chair_id, v_svc_beard, '2026-06-01 11:00:00+01', '2026-06-01 11:15:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000004', v_shop_id, v_c4, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-01 14:00:00+01', '2026-06-01 14:30:00+01', 'completed'),

  -- ── 2 Jun (Tue) ───────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000005', v_shop_id, v_c5, v_barber_id, v_chair_id, v_svc_combo, '2026-06-02 09:30:00+01', '2026-06-02 10:15:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000006', v_shop_id, v_c6, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-02 11:00:00+01', '2026-06-02 11:30:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000007', v_shop_id, v_c7, v_barber_id, v_chair_id, v_svc_beard, '2026-06-02 14:00:00+01', '2026-06-02 14:15:00+01', 'completed'),

  -- ── 3 Jun (Wed) ───────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000008', v_shop_id, v_c8, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-03 09:00:00+01', '2026-06-03 09:30:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000009', v_shop_id, v_c1, v_barber_id, v_chair_id, v_svc_combo, '2026-06-03 13:00:00+01', '2026-06-03 13:45:00+01', 'completed'),

  -- ── 4 Jun (Thu) ───────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000010', v_shop_id, v_c2, v_barber_id, v_chair_id, v_svc_beard, '2026-06-04 09:00:00+01', '2026-06-04 09:15:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000011', v_shop_id, v_c3, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-04 11:00:00+01', '2026-06-04 11:30:00+01', 'cancelled'),
  ('d0000000-0000-0000-0000-000000000012', v_shop_id, v_c4, v_barber_id, v_chair_id, v_svc_combo, '2026-06-04 14:00:00+01', '2026-06-04 14:45:00+01', 'completed'),

  -- ── 5 Jun (Fri) ───────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000013', v_shop_id, v_c5, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-05 09:00:00+01', '2026-06-05 09:30:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000014', v_shop_id, v_c6, v_barber_id, v_chair_id, v_svc_combo, '2026-06-05 10:30:00+01', '2026-06-05 11:15:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000015', v_shop_id, v_c7, v_barber_id, v_chair_id, v_svc_beard, '2026-06-05 13:00:00+01', '2026-06-05 13:15:00+01', 'completed'),

  -- ── 6 Jun (Sat) ───────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000016', v_shop_id, v_c8, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-06 09:00:00+01', '2026-06-06 09:30:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000017', v_shop_id, v_c1, v_barber_id, v_chair_id, v_svc_combo, '2026-06-06 10:00:00+01', '2026-06-06 10:45:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000018', v_shop_id, v_c2, v_barber_id, v_chair_id, v_svc_beard, '2026-06-06 11:00:00+01', '2026-06-06 11:15:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000019', v_shop_id, v_c3, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-06 14:30:00+01', '2026-06-06 15:00:00+01', 'completed'),

  -- ── 8 Jun (Mon) ───────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000020', v_shop_id, v_c4, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-08 09:30:00+01', '2026-06-08 10:00:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000021', v_shop_id, v_c5, v_barber_id, v_chair_id, v_svc_combo, '2026-06-08 11:00:00+01', '2026-06-08 11:45:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000022', v_shop_id, v_c6, v_barber_id, v_chair_id, v_svc_beard, '2026-06-08 13:00:00+01', '2026-06-08 13:15:00+01', 'no_show'),

  -- ── 9 Jun (Tue) ───────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000023', v_shop_id, v_c7, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-09 10:00:00+01', '2026-06-09 10:30:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000024', v_shop_id, v_c8, v_barber_id, v_chair_id, v_svc_combo, '2026-06-09 13:00:00+01', '2026-06-09 13:45:00+01', 'completed'),

  -- ── 10 Jun (Wed) ──────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000025', v_shop_id, v_c1, v_barber_id, v_chair_id, v_svc_beard, '2026-06-10 09:00:00+01', '2026-06-10 09:15:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000026', v_shop_id, v_c2, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-10 11:00:00+01', '2026-06-10 11:30:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000027', v_shop_id, v_c3, v_barber_id, v_chair_id, v_svc_combo, '2026-06-10 14:00:00+01', '2026-06-10 14:45:00+01', 'cancelled'),

  -- ── 11 Jun (Thu) ──────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000028', v_shop_id, v_c4, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-11 09:30:00+01', '2026-06-11 10:00:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000029', v_shop_id, v_c5, v_barber_id, v_chair_id, v_svc_beard, '2026-06-11 11:00:00+01', '2026-06-11 11:15:00+01', 'completed'),
  ('d0000000-0000-0000-0000-000000000030', v_shop_id, v_c6, v_barber_id, v_chair_id, v_svc_combo, '2026-06-11 14:00:00+01', '2026-06-11 14:45:00+01', 'completed'),

  -- ── 12 Jun (Fri) — TODAY ──────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000031', v_shop_id, v_c7, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-12 09:00:00+01', '2026-06-12 09:30:00+01', 'accepted'),
  ('d0000000-0000-0000-0000-000000000032', v_shop_id, v_c8, v_barber_id, v_chair_id, v_svc_combo, '2026-06-12 10:00:00+01', '2026-06-12 10:45:00+01', 'accepted'),
  ('d0000000-0000-0000-0000-000000000033', v_shop_id, v_c1, v_barber_id, v_chair_id, v_svc_beard, '2026-06-12 11:30:00+01', '2026-06-12 11:45:00+01', 'accepted'),
  ('d0000000-0000-0000-0000-000000000034', v_shop_id, v_c2, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-12 14:00:00+01', '2026-06-12 14:30:00+01', 'pending'),

  -- ── 13 Jun (Sat) ──────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000035', v_shop_id, v_c3, v_barber_id, v_chair_id, v_svc_combo, '2026-06-13 09:00:00+01', '2026-06-13 09:45:00+01', 'accepted'),
  ('d0000000-0000-0000-0000-000000000036', v_shop_id, v_c4, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-13 10:30:00+01', '2026-06-13 11:00:00+01', 'accepted'),
  ('d0000000-0000-0000-0000-000000000037', v_shop_id, v_c5, v_barber_id, v_chair_id, v_svc_beard, '2026-06-13 13:00:00+01', '2026-06-13 13:15:00+01', 'pending'),

  -- ── 15 Jun (Mon) ──────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000038', v_shop_id, v_c6, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-15 09:00:00+01', '2026-06-15 09:30:00+01', 'accepted'),
  ('d0000000-0000-0000-0000-000000000039', v_shop_id, v_c7, v_barber_id, v_chair_id, v_svc_combo, '2026-06-15 11:00:00+01', '2026-06-15 11:45:00+01', 'pending'),

  -- ── 16 Jun (Tue) ──────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000040', v_shop_id, v_c8, v_barber_id, v_chair_id, v_svc_beard, '2026-06-16 10:00:00+01', '2026-06-16 10:15:00+01', 'pending'),

  -- ── 17 Jun (Wed) ──────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000041', v_shop_id, v_c1, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-17 09:30:00+01', '2026-06-17 10:00:00+01', 'pending'),

  -- ── 18 Jun (Thu) ──────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000042', v_shop_id, v_c2, v_barber_id, v_chair_id, v_svc_combo, '2026-06-18 10:00:00+01', '2026-06-18 10:45:00+01', 'pending'),

  -- ── 19 Jun (Fri) ──────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000043', v_shop_id, v_c3, v_barber_id, v_chair_id, v_svc_fade,  '2026-06-19 09:00:00+01', '2026-06-19 09:30:00+01', 'pending'),

  -- ── 20 Jun (Sat) ──────────────────────────────────────────────
  ('d0000000-0000-0000-0000-000000000044', v_shop_id, v_c4, v_barber_id, v_chair_id, v_svc_combo, '2026-06-20 10:00:00+01', '2026-06-20 10:45:00+01', 'pending')

  on conflict (id) do nothing;

end $$;
