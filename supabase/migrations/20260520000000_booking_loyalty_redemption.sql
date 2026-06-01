ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS loyalty_tier_id uuid
    REFERENCES public.loyalty_reward_tiers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS loyalty_points_redeemed integer NULL,
  ADD COLUMN IF NOT EXISTS loyalty_points_refunded boolean NOT NULL DEFAULT false;

-- loyalty_tier_id: which reward tier was redeemed at booking time (null if none)
-- loyalty_points_redeemed: points deducted at booking time — stored separately
--   so it remains accurate even if the tier is later edited or deleted
-- loyalty_points_refunded: set to true by admin after manually refunding points
--   on a cancelled booking
