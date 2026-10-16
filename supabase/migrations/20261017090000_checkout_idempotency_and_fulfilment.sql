-- Checkout schema prerequisites only.
-- Review against the initial schema and test in an isolated database before applying.
-- This migration is intentionally NOT applied to the connected Supabase project.

begin;

alter table public.orders
  add column if not exists fulfilment_method text;

alter table public.orders
  add column if not exists checkout_request_key uuid;

-- Existing rows may have NULL values. New checkout requests should supply a key,
-- and the server-side order creation function must require it.
create unique index if not exists orders_checkout_request_key_uidx
  on public.orders (checkout_request_key)
  where checkout_request_key is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_fulfilment_method_check'
  ) then
    alter table public.orders
      add constraint orders_fulfilment_method_check
      check (fulfilment_method is null or fulfilment_method in ('delivery', 'pickup'));
  end if;
end
$$;

commit;
