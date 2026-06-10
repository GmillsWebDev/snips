-- =====================
-- 1. discount_codes
-- =====================

CREATE TABLE public.discount_codes (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  code                   text NOT NULL,
  description            text,
  discount_type          text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value         integer NOT NULL CHECK (discount_value > 0),
  -- For percentage: 1–100 (percent). For fixed: amount in pence (e.g. 500 = £5).
  min_spend_pence        integer NULL,
  -- Minimum booking value in pence required to use this code. NULL = no minimum.
  max_uses               integer NULL,
  -- Total redemption cap across all customers. NULL = unlimited.
  max_uses_per_customer  integer NULL,
  -- Per-customer cap. NULL = unlimited. 1 = single use per customer.
  times_used             integer NOT NULL DEFAULT 0,
  valid_from             timestamptz NULL,
  valid_until            timestamptz NULL,
  is_active              boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, code)
  -- Code must be unique within a shop (case will be normalised to uppercase on insert)
);

CREATE INDEX ON public.discount_codes (shop_id, is_active);

-- =====================
-- 2. discount_code_services
-- =====================

CREATE TABLE public.discount_code_services (
  discount_code_id  uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  service_id        uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_code_id, service_id)
);

-- No rows for a given discount_code_id = applies to all services.
-- One or more rows = applies only to those services.

-- =====================
-- 3. discount_code_uses
-- =====================

CREATE TABLE public.discount_code_uses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id  uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  customer_id       uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  -- Nullable to support guest bookings
  booking_id        uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  used_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.discount_code_uses (discount_code_id);
CREATE INDEX ON public.discount_code_uses (customer_id);

-- =====================
-- 4. bookings columns
-- =====================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS discount_code_id uuid REFERENCES public.discount_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount_pence integer NULL;

-- =====================
-- 5. RLS
-- =====================

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_code_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_code_uses ENABLE ROW LEVEL SECURITY;

-- discount_codes: public can read active codes (needed for validation at booking)
CREATE POLICY dc_public_read ON public.discount_codes
  FOR SELECT USING (is_active = true);

-- discount_codes: admins have full access for their shop
CREATE POLICY dc_admin_all ON public.discount_codes
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- discount_code_services: public read (needed for validation)
CREATE POLICY dcs_public_read ON public.discount_code_services
  FOR SELECT USING (true);

-- discount_code_services: admin full access
CREATE POLICY dcs_admin_all ON public.discount_code_services
  FOR ALL USING (
    discount_code_id IN (
      SELECT id FROM public.discount_codes WHERE shop_id IN (
        SELECT shop_id FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'owner'
      )
    )
  );

-- discount_code_uses: admin read for their shop
CREATE POLICY dcu_admin_read ON public.discount_code_uses
  FOR SELECT USING (
    discount_code_id IN (
      SELECT id FROM public.discount_codes WHERE shop_id IN (
        SELECT shop_id FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'owner'
      )
    )
  );
