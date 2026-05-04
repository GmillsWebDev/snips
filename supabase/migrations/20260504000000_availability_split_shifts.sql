-- Drop the legacy unique constraint on (barber_id, day_of_week) if it exists.
-- The original schema did not create one, but guard against it being added later.
do $$
declare
  v_constraint_name text;
begin
  select c.conname into v_constraint_name
  from   pg_constraint c
  join   pg_class      t on t.oid = c.conrelid
  join   pg_namespace  n on n.oid = t.relnamespace
  where  n.nspname  = 'public'
    and  t.relname  = 'availability_rules'
    and  c.contype  = 'u'
    and  c.conkey   = array(
           select a.attnum
           from   pg_attribute a
           where  a.attrelid = t.oid
             and  a.attname  in ('barber_id', 'day_of_week')
           order  by a.attnum
         );

  if v_constraint_name is not null then
    execute format('alter table public.availability_rules drop constraint %I', v_constraint_name);
  end if;
end $$;

-- Add shift_number column; default 1 so existing rows satisfy the new constraint.
alter table public.availability_rules
  add column shift_number integer not null default 1;

-- Backfill (also handles rows inserted before this migration runs in staging/prod).
update public.availability_rules
set    shift_number = 1;

-- One barber can have at most shift 1 and shift 2 on any given day.
alter table public.availability_rules
  add constraint availability_rules_barber_day_shift_key
  unique (barber_id, day_of_week, shift_number);

-- Prevent any value other than 1 or 2 being written.
alter table public.availability_rules
  add constraint availability_rules_shift_number_check
  check (shift_number in (1, 2));
