-- Function that fires when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- If the user signed up with a role metadata of 'owner',
  -- we insert a user_roles row. Otherwise we leave it —
  -- the customer record gets created at booking time.
  if new.raw_user_meta_data->>'role' = 'owner' then
    insert into public.user_roles (user_id, shop_id, role)
    select
      new.id,
      (new.raw_user_meta_data->>'shop_id')::uuid,
      'owner'
    where (new.raw_user_meta_data->>'shop_id') is not null;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger that calls the function after every new user insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


  -- Drop the placeholder above and replace with this clean version
create or replace function public.handle_new_shop()
returns trigger as $$
declare
  v_barber_id uuid;
begin
  if new.plan_type = 'solo' then
    -- Create the default barber
    insert into public.barbers (shop_id, user_id, name, is_active)
    values (new.id, new.owner_id, 'Owner', true)
    returning id into v_barber_id;

    -- Create the default chair linked to that barber
    insert into public.chairs (shop_id, barber_id, label, is_active)
    values (new.id, v_barber_id, 'Chair 1', true);
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger that fires after a new shop is inserted
create trigger on_shop_created
  after insert on public.shops
  for each row execute function public.handle_new_shop();