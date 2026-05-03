-- Assign consecutive display_order values (1, 2, 3 …) per shop,
-- ordered by the existing display_order then id as a tiebreaker,
-- so we clear any duplicates (including the all-zero default) before
-- adding the unique constraint.
with ranked as (
  select
    id,
    row_number() over (partition by shop_id order by display_order, id) as new_order
  from public.services
)
update public.services s
set    display_order = r.new_order
from   ranked r
where  s.id = r.id;

alter table public.services
  add constraint services_shop_id_display_order_key
  unique (shop_id, display_order);
