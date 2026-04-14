-- Prevent two bookings for the same barber overlapping in time
-- Only applies to active bookings (pending or accepted)
create or replace function public.check_booking_overlap()
returns trigger as $$
begin
  if exists (
    select 1 from public.bookings
    where
      barber_id = new.barber_id
      and id != new.id
      and status in ('pending', 'accepted')
      and tstzrange(start_at, end_at, '[)') && tstzrange(new.start_at, new.end_at, '[)')
  ) then
    raise exception 'BOOKING_OVERLAP'
      using hint = 'This time slot is no longer available';
  end if;

  return new;
end;
$$ language plpgsql;

-- Fire on both insert and update so rescheduling is also protected
create trigger enforce_booking_no_overlap
  before insert or update on public.bookings
  for each row execute function public.check_booking_overlap();

-- Also add a Postgres advisory lock function to serialise
-- concurrent inserts for the same barber slot
create or replace function public.create_booking(
  p_shop_id       uuid,
  p_customer_id   uuid,
  p_barber_id     uuid,
  p_chair_id      uuid,
  p_service_id    uuid,
  p_start_at      timestamptz,
  p_end_at        timestamptz,
  p_notes         text default null
)
returns public.bookings as $$
declare
  v_booking public.bookings;
begin
  -- Acquire an advisory lock scoped to this barber + start time
  -- This serialises concurrent requests for the exact same slot
  perform pg_advisory_xact_lock(
    hashtext(p_barber_id::text || p_start_at::text)
  );

  insert into public.bookings (
    shop_id,
    customer_id,
    barber_id,
    chair_id,
    service_id,
    start_at,
    end_at,
    notes,
    status
  ) values (
    p_shop_id,
    p_customer_id,
    p_barber_id,
    p_chair_id,
    p_service_id,
    p_start_at,
    p_end_at,
    p_notes,
    'pending'
  )
  returning * into v_booking;

  return v_booking;
end;
$$ language plpgsql security definer;