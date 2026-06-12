-- =============================================================
-- Snips — June 2026 demo seed BACKOUT
-- Removes everything inserted by seed_june_demo.sql
-- Bookings must be deleted before customers (FK restrict).
-- =============================================================

delete from public.bookings
where id::text like 'd0000000-0000-0000-0000-%';

delete from public.customers
where id::text like 'c1000000-0000-0000-0000-%';
