ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS loyalty_discount_amount_pence integer NULL;

-- Stores the monetary value of the redeemed loyalty tier at booking time.
-- Derived from loyalty_reward_tiers.reward_value_pence at the moment of
-- booking. NULL if no loyalty tier was redeemed. 0 if a tier was redeemed
-- but had no monetary value set.
