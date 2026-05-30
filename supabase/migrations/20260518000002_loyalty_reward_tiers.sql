CREATE TABLE loyalty_reward_tiers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name                text NOT NULL,
  points_required     integer NOT NULL CHECK (points_required > 0),
  reward_description  text NOT NULL,
  reward_value_pence  integer NULL,
  is_active           boolean NOT NULL DEFAULT true,
  display_order       integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON loyalty_reward_tiers (shop_id, display_order);

ALTER TABLE loyalty_reward_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tiers_admin_all ON loyalty_reward_tiers
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM user_roles
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY tiers_customer_read ON loyalty_reward_tiers
  FOR SELECT USING (
    is_active = true AND
    shop_id IN (
      SELECT shop_id FROM customers
      WHERE user_id = auth.uid()
    )
  );
