ALTER TABLE shop_preferences
  ADD COLUMN IF NOT EXISTS loyalty_enabled boolean NOT NULL DEFAULT false;
