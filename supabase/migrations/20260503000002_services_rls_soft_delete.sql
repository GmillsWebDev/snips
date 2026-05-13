drop policy "Anyone can view active services" on public.services;

create policy "Anyone can view active services"
  on public.services for select
  using (is_active = true and is_deleted = false);
