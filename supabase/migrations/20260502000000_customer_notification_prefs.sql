create table public.customer_notification_preferences (
  customer_id             uuid primary key references public.customers(id) on delete cascade,
  email_confirmations     boolean not null default true,
  email_reminders         boolean not null default true,
  whatsapp_confirmations  boolean not null default false,
  whatsapp_reminders      boolean not null default false,
  sms_confirmations       boolean not null default false,
  sms_reminders           boolean not null default false,
  updated_at              timestamptz not null default now()
);

alter table public.customer_notification_preferences enable row level security;

create policy "Customers can manage their own notification preferences"
  on public.customer_notification_preferences for all
  using (
    customer_id in (
      select id from public.customers where user_id = auth.uid()
    )
  );

create policy "Staff can view notification preferences in their shop"
  on public.customer_notification_preferences for select
  using (
    customer_id in (
      select id from public.customers where shop_id = public.get_my_shop_id()
    )
  );
