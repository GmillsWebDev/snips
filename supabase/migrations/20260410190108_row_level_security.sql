-- Get the shop_id for the currently authenticated user's shop (as owner)
create or replace function public.get_my_shop_id()
returns uuid as $$
  select id from public.shops where owner_id = auth.uid() limit 1;
$$ language sql security definer stable;

-- Get the role of the current user for a given shop
create or replace function public.get_my_role(p_shop_id uuid)
returns text as $$
  select role from public.user_roles
  where user_id = auth.uid() and shop_id = p_shop_id
  limit 1;
$$ language sql security definer stable;

-- Check if the current user is the owner of a given shop
create or replace function public.is_shop_owner(p_shop_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.shops
    where id = p_shop_id and owner_id = auth.uid()
  );
$$ language sql security definer stable;

-- Check if the current user is a barber in a given shop
create or replace function public.is_shop_barber(p_shop_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.barbers
    where shop_id = p_shop_id and user_id = auth.uid() and is_active = true
  );
$$ language sql security definer stable;

-- Check if the current user is staff (owner or barber) in a given shop
create or replace function public.is_shop_staff(p_shop_id uuid)
returns boolean as $$
  select public.is_shop_owner(p_shop_id) or public.is_shop_barber(p_shop_id);
$$ language sql security definer stable;

-- =====================
-- SHOPS
-- =====================
alter table public.shops enable row level security;

create policy "Owners can manage their shop"
  on public.shops for all
  using (owner_id = auth.uid());

create policy "Anyone can view active shops by slug"
  on public.shops for select
  using (is_active = true);


-- =====================
-- USER ROLES
-- =====================
alter table public.user_roles enable row level security;

create policy "Staff can view roles in their shop"
  on public.user_roles for select
  using (public.is_shop_staff(shop_id));

create policy "Owners can manage roles in their shop"
  on public.user_roles for all
  using (public.is_shop_owner(shop_id));


-- =====================
-- BARBERS
-- =====================
alter table public.barbers enable row level security;

create policy "Anyone can view active barbers"
  on public.barbers for select
  using (is_active = true);

create policy "Owners can manage barbers in their shop"
  on public.barbers for all
  using (public.is_shop_owner(shop_id));


-- =====================
-- CHAIRS
-- =====================
alter table public.chairs enable row level security;

create policy "Anyone can view active chairs"
  on public.chairs for select
  using (is_active = true);

create policy "Owners can manage chairs in their shop"
  on public.chairs for all
  using (public.is_shop_owner(shop_id));


-- =====================
-- SERVICES
-- =====================
alter table public.services enable row level security;

create policy "Anyone can view active services"
  on public.services for select
  using (is_active = true);

create policy "Owners can manage services in their shop"
  on public.services for all
  using (public.is_shop_owner(shop_id));


-- =====================
-- CUSTOMERS
-- =====================
alter table public.customers enable row level security;

create policy "Customers can view and edit their own record"
  on public.customers for all
  using (user_id = auth.uid());

create policy "Staff can view customers in their shop"
  on public.customers for select
  using (public.is_shop_staff(shop_id));

create policy "Owners can manage all customers in their shop"
  on public.customers for all
  using (public.is_shop_owner(shop_id));

create policy "Anyone can create a customer record"
  on public.customers for insert
  with check (true);


-- =====================
-- AVAILABILITY RULES
-- =====================
alter table public.availability_rules enable row level security;

create policy "Anyone can view availability rules"
  on public.availability_rules for select
  using (true);

create policy "Owners can manage availability rules"
  on public.availability_rules for all
  using (
    public.is_shop_owner(
      (select shop_id from public.barbers where id = barber_id)
    )
  );


-- =====================
-- BLOCKED SLOTS
-- =====================
alter table public.blocked_slots enable row level security;

create policy "Anyone can view blocked slots"
  on public.blocked_slots for select
  using (true);

create policy "Owners can manage blocked slots"
  on public.blocked_slots for all
  using (
    public.is_shop_owner(
      (select shop_id from public.barbers where id = barber_id)
    )
  );


-- =====================
-- BOOKINGS
-- =====================
alter table public.bookings enable row level security;

create policy "Customers can view their own bookings"
  on public.bookings for select
  using (
    customer_id in (
      select id from public.customers where user_id = auth.uid()
    )
  );

create policy "Customers can create bookings"
  on public.bookings for insert
  with check (true);

create policy "Customers can cancel their own bookings"
  on public.bookings for update
  using (
    customer_id in (
      select id from public.customers where user_id = auth.uid()
    )
  )
  with check (status = 'cancelled');

create policy "Staff can view all bookings in their shop"
  on public.bookings for select
  using (public.is_shop_staff(shop_id));

create policy "Owners can manage all bookings in their shop"
  on public.bookings for all
  using (public.is_shop_owner(shop_id));


-- =====================
-- WAITLIST
-- =====================
alter table public.waitlist enable row level security;

create policy "Customers can view their own waitlist entries"
  on public.waitlist for select
  using (
    customer_id in (
      select id from public.customers where user_id = auth.uid()
    )
  );

create policy "Customers can add themselves to waitlist"
  on public.waitlist for insert
  with check (true);

create policy "Customers can remove themselves from waitlist"
  on public.waitlist for delete
  using (
    customer_id in (
      select id from public.customers where user_id = auth.uid()
    )
  );

create policy "Owners can manage waitlist for their shop"
  on public.waitlist for all
  using (public.is_shop_owner(shop_id));


-- =====================
-- REVIEWS
-- =====================
alter table public.reviews enable row level security;

create policy "Anyone can view visible reviews"
  on public.reviews for select
  using (is_visible = true);

create policy "Customers can write a review for their own completed booking"
  on public.reviews for insert
  with check (
    customer_id in (
      select id from public.customers where user_id = auth.uid()
    )
  );

create policy "Owners can manage reviews for their shop"
  on public.reviews for all
  using (
    public.is_shop_owner(
      (select shop_id from public.bookings where id = booking_id)
    )
  );


-- =====================
-- NOTIFICATION LOG
-- =====================
alter table public.notification_log enable row level security;

create policy "Owners can view notification log for their shop"
  on public.notification_log for select
  using (
    public.is_shop_owner(
      (select shop_id from public.bookings where id = booking_id)
    )
  );

create policy "Service role can insert notification logs"
  on public.notification_log for insert
  with check (true);


-- =====================
-- DISCOUNT CODES
-- =====================
alter table public.discount_codes enable row level security;

create policy "Anyone can view active discount codes to validate"
  on public.discount_codes for select
  using (is_active = true);

create policy "Owners can manage discount codes for their shop"
  on public.discount_codes for all
  using (public.is_shop_owner(shop_id));