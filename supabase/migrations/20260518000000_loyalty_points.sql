-- 1. Loyalty config on shop_preferences
--    NULL = that earning method is disabled.
--    loyalty_points_per_booking: flat points per completed booking (e.g. 5)
--    loyalty_points_per_pence:   1 point per N pence spent
--      e.g. 100 = 1 pt per £1, 500 = 1 pt per £5
--      points earned = floor(price_pence / loyalty_points_per_pence)

ALTER TABLE shop_preferences
  ADD COLUMN IF NOT EXISTS loyalty_points_per_booking integer NULL,
  ADD COLUMN IF NOT EXISTS loyalty_points_per_pence   integer NULL;

-- 2. Loyalty points log

CREATE TABLE IF NOT EXISTS loyalty_points_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  shop_id     uuid        NOT NULL REFERENCES shops(id)     ON DELETE CASCADE,
  booking_id  uuid        REFERENCES bookings(id) ON DELETE SET NULL,
  change      integer     NOT NULL,
  reason      text        NOT NULL, -- 'booking_completed' | 'manual_adjustment'
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyalty_points_log_customer_created
  ON loyalty_points_log (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS loyalty_points_log_shop
  ON loyalty_points_log (shop_id);

-- 3. RLS

ALTER TABLE loyalty_points_log ENABLE ROW LEVEL SECURITY;

-- Customers can read their own log entries
CREATE POLICY loyalty_log_customer_read ON loyalty_points_log
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

-- Shop owners can read all log entries for their shop
CREATE POLICY loyalty_log_admin_read ON loyalty_points_log
  FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM user_roles
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Shop owners can insert (manual adjustments via server actions)
-- Service-role edge functions bypass RLS entirely so don't need a policy
CREATE POLICY loyalty_log_admin_insert ON loyalty_points_log
  FOR INSERT
  WITH CHECK (
    shop_id IN (
      SELECT shop_id FROM user_roles
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
