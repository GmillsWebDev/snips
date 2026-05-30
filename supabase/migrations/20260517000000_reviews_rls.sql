-- Reviews RLS policies (idempotent: drop then recreate)

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reviews_public_read ON reviews;
DROP POLICY IF EXISTS reviews_customer_insert ON reviews;
DROP POLICY IF EXISTS reviews_own_read ON reviews;
DROP POLICY IF EXISTS reviews_admin_update ON reviews;

-- 1. Public read: anon and authenticated can see visible reviews
CREATE POLICY reviews_public_read ON reviews
  FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

-- 2. Customer insert: only for bookings belonging to the current user
CREATE POLICY reviews_customer_insert ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

-- 3. Customer own read: see own reviews regardless of is_visible
CREATE POLICY reviews_own_read ON reviews
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

-- 4. Admin update: shop owners can update (e.g. toggle is_visible)
CREATE POLICY reviews_admin_update ON reviews
  FOR UPDATE
  TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN user_roles ur ON ur.shop_id = b.shop_id
      WHERE ur.user_id = auth.uid() AND ur.role = 'owner'
    )
  );
