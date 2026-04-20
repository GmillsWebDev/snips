-- =============================================================
-- Snips — undo script for seed_bookings.sql
-- Removes all customers and bookings inserted by seed_bookings.sql.
-- Safe to re-run (deletes by fixed UUID, no-ops if already gone).
-- =============================================================

do $$
declare
  -- Booking UUIDs
  v_book_ids uuid[] := array[
    'c1000000-0000-0000-0000-000000000001'::uuid,
    'c1000000-0000-0000-0000-000000000002'::uuid,
    'c1000000-0000-0000-0000-000000000003'::uuid,
    'c1000000-0000-0000-0000-000000000004'::uuid,
    'c1000000-0000-0000-0000-000000000005'::uuid,
    'c1000000-0000-0000-0000-000000000006'::uuid,
    'c1000000-0000-0000-0000-000000000007'::uuid,
    'c1000000-0000-0000-0000-000000000008'::uuid
  ];

  -- Customer UUIDs
  v_cust_ids uuid[] := array[
    'b1000000-0000-0000-0000-000000000001'::uuid,
    'b1000000-0000-0000-0000-000000000002'::uuid,
    'b1000000-0000-0000-0000-000000000003'::uuid,
    'b1000000-0000-0000-0000-000000000004'::uuid,
    'b1000000-0000-0000-0000-000000000005'::uuid
  ];
begin

  delete from public.bookings  where id = any(v_book_ids);
  delete from public.customers where id = any(v_cust_ids);

end $$;
