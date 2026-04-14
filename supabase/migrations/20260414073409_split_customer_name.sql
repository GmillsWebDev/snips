alter table public.customers
  add column first_name text,
  add column last_name  text;

-- Copy existing name data into first_name as a fallback
-- (safe to run even if the table is empty at this stage)
update public.customers
  set first_name = split_part(name, ' ', 1),
      last_name  = split_part(name, ' ', 2)
  where name is not null;

-- Now drop the old name column
alter table public.customers
  drop column name;

-- Add not null constraints now that data is migrated
alter table public.customers
  alter column first_name set not null,
  alter column last_name  set not null;