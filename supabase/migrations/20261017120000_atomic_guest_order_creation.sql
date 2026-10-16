-- Guest checkout order creation with atomic stock reservation.
-- Review and test in an isolated Supabase project before applying to any live database.
-- Depends on 20261017090000_checkout_idempotency_and_fulfilment.sql.

begin;

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  status text not null default 'reserved'
    check (status in ('reserved', 'released', 'consumed')),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create index if not exists inventory_reservations_expiry_idx
  on public.inventory_reservations (expires_at)
  where status = 'reserved';

alter table public.inventory_reservations enable row level security;
-- Intentionally no client-facing policies. Reservations are managed only by trusted database routines.

alter table public.inventory_movements
  drop constraint if exists inventory_movements_movement_type_check;
alter table public.inventory_movements
  add constraint inventory_movements_movement_type_check
  check (movement_type in ('opening_balance','restock','sale','return','damage','correction','reservation','release'));

create or replace function private.create_guest_order(p_payload jsonb)
returns table(order_id uuid, order_number text, order_total numeric, currency text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key uuid;
  v_name text;
  v_phone text;
  v_email text;
  v_fulfilment text;
  v_address jsonb;
  v_note text;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2);
  v_line record;
  v_product public.products%rowtype;
  v_count integer := 0;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid checkout request' using errcode = '22023';
  end if;

  begin
    v_key := (p_payload->>'requestKey')::uuid;
  exception when others then
    raise exception 'A valid checkout request key is required' using errcode = '22023';
  end;

  -- Idempotent retry: return the existing order before doing any further work.
  select o.id, o.order_number, o.total, o.currency
    into v_order_id, v_order_number, v_total, currency
  from public.orders o
  where o.checkout_request_key = v_key;

  if found then
    order_id := v_order_id;
    order_number := v_order_number;
    order_total := v_total;
    return next;
    return;
  end if;

  v_name := nullif(trim(coalesce(p_payload#>>'{customer,name}', '')), '');
  v_phone := nullif(trim(coalesce(p_payload#>>'{customer,phone}', '')), '');
  v_email := nullif(trim(coalesce(p_payload#>>'{customer,email}', '')), '');
  v_fulfilment := p_payload->>'fulfilmentMethod';
  v_note := nullif(trim(coalesce(p_payload->>'customerNote', '')), '');
  v_address := coalesce(p_payload->'deliveryAddress', '{}'::jsonb);

  if v_name is null or length(v_name) > 120
     or v_phone is null or length(v_phone) > 30
     or length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 7 then
    raise exception 'Valid customer name and phone are required' using errcode = '22023';
  end if;
  if v_note is not null and length(v_note) > 1000 then
    raise exception 'Order notes are too long' using errcode = '22023';
  end if;
  if v_email is not null and (length(v_email) > 254 or v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$') then
    raise exception 'Invalid email address' using errcode = '22023';
  end if;
  if v_fulfilment is null or v_fulfilment not in ('delivery', 'pickup') then
    raise exception 'Choose delivery or pickup' using errcode = '22023';
  end if;
  if v_fulfilment = 'delivery' and (
    nullif(trim(coalesce(v_address->>'address','')), '') is null or
    nullif(trim(coalesce(v_address->>'city','')), '') is null or
    nullif(trim(coalesce(v_address->>'state','')), '') is null or
    length(coalesce(v_address->>'address','')) > 240 or
    length(coalesce(v_address->>'city','')) > 100 or
    length(coalesce(v_address->>'state','')) > 100
  ) then
    raise exception 'Complete the delivery address' using errcode = '22023';
  end if;

  if coalesce(jsonb_typeof(p_payload->'items'), '') <> 'array' then
    raise exception 'Cart items must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_payload->'items') < 1
     or jsonb_array_length(p_payload->'items') > 50 then
    raise exception 'Cart must contain between 1 and 50 items' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_payload->'items') as i("productId" uuid, quantity integer)
    group by i."productId" having count(*) > 1
  ) then
    raise exception 'Duplicate product lines are not allowed' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_payload->'items') as i("productId" uuid, quantity integer)
    where i."productId" is null or i.quantity is null or i.quantity < 1 or i.quantity > 50
  ) then
    raise exception 'Invalid product or quantity' using errcode = '22023';
  end if;

  -- Lock product rows in a stable order to avoid deadlocks for overlapping carts.
  perform p.id
  from public.products p
  join (
    select distinct i."productId" as product_id
    from jsonb_to_recordset(p_payload->'items') as i("productId" uuid, quantity integer)
  ) requested on requested.product_id = p.id
  order by p.id
  for update of p;

  if (
    select count(*)
    from jsonb_to_recordset(p_payload->'items') as i("productId" uuid, quantity integer)
  ) <> (
    select count(*)
    from jsonb_to_recordset(p_payload->'items') as i("productId" uuid, quantity integer)
    join public.products p on p.id = i."productId" and p.is_active = true
  ) then
    raise exception 'One or more products are unavailable' using errcode = 'P0002';
  end if;

  for v_line in
    select i."productId" as product_id, i.quantity
    from jsonb_to_recordset(p_payload->'items') as i("productId" uuid, quantity integer)
    order by i."productId"
  loop
    select * into v_product from public.products p where p.id = v_line.product_id;
    if v_product.stock_quantity < v_line.quantity then
      raise exception 'Insufficient stock for product %', v_product.name using errcode = 'P0001';
    end if;
    v_subtotal := v_subtotal + (v_product.price * v_line.quantity);
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'Cart is empty' using errcode = '22023';
  end if;

  v_order_number := 'UJ-' || to_char(now() at time zone 'UTC', 'YYYYMMDD') || '-' ||
    upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));

  insert into public.orders (
    order_number, customer_name, customer_email, customer_phone, delivery_address,
    subtotal, delivery_fee, discount_total, total, currency, order_status,
    payment_status, customer_note, fulfilment_method, checkout_request_key
  ) values (
    v_order_number, v_name, v_email, v_phone,
    case when v_fulfilment = 'delivery' then v_address else '{}'::jsonb end,
    v_subtotal, 0, 0, v_subtotal, 'NGN', 'pending', 'unpaid', v_note, v_fulfilment, v_key
  ) returning id into v_order_id;

  for v_line in
    select i."productId" as product_id, i.quantity
    from jsonb_to_recordset(p_payload->'items') as i("productId" uuid, quantity integer)
    order by i."productId"
  loop
    select * into v_product from public.products p where p.id = v_line.product_id;

    insert into public.order_items (
      order_id, product_id, product_name, sku, condition, quantity,
      unit_price, line_total, warranty_snapshot
    ) values (
      v_order_id, v_product.id, v_product.name, v_product.sku, v_product.condition,
      v_line.quantity, v_product.price, v_product.price * v_line.quantity,
      v_product.warranty_description
    );

    update public.products
      set stock_quantity = stock_quantity - v_line.quantity, updated_at = now()
      where id = v_product.id;

    insert into public.inventory_reservations (order_id, product_id, quantity)
      values (v_order_id, v_product.id, v_line.quantity);

    insert into public.inventory_movements (
      product_id, quantity_delta, movement_type, reference, notes
    ) values (
      v_product.id, -v_line.quantity, 'reservation', v_order_number,
      'Stock reserved for pending guest order'
    );
  end loop;

  order_id := v_order_id;
  order_number := v_order_number;
  order_total := v_subtotal;
  currency := 'NGN';
  return next;
exception
  when unique_violation then
    -- A concurrent retry may win the idempotency race. Return its order if present.
    select o.id, o.order_number, o.total, o.currency
      into order_id, order_number, order_total, currency
    from public.orders o
    where o.checkout_request_key = (p_payload->>'requestKey')::uuid;
    if order_id is not null then
      return next;
      return;
    end if;
    raise;
end;
$$;

-- The exposed public RPC is an invoker-only wrapper. Privileged work stays in the
-- non-exposed private schema, and the private implementation has a fixed search path.
create or replace function public.create_guest_order(p_payload jsonb)
returns table(order_id uuid, order_number text, order_total numeric, currency text)
language sql
security invoker
set search_path = ''
as $$
  select * from private.create_guest_order(p_payload);
$$;

revoke all on function public.create_guest_order(jsonb) from public;
grant execute on function public.create_guest_order(jsonb) to anon, authenticated;
grant usage on schema private to anon, authenticated;
revoke all on function private.create_guest_order(jsonb) from public;
grant execute on function private.create_guest_order(jsonb) to anon, authenticated;


-- Trusted stock-release routine. It is deliberately not callable by browser roles.
-- A scheduler must invoke this periodically after the migration is reviewed and applied.
create or replace function private.release_expired_inventory_reservations(p_batch_size integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation record;
  v_released integer := 0;
begin
  if p_batch_size is null or p_batch_size < 1 or p_batch_size > 1000 then
    raise exception 'Batch size must be between 1 and 1000' using errcode = '22023';
  end if;

  for v_reservation in
    select r.id, r.order_id, r.product_id, r.quantity, o.order_number
    from public.inventory_reservations r
    join public.orders o on o.id = r.order_id
    where r.status = 'reserved'
      and r.expires_at <= now()
      and o.payment_status <> 'paid'
      and o.order_status not in ('cancelled', 'returned')
    order by r.expires_at, r.id
    for update of r skip locked
    limit p_batch_size
  loop
    update public.inventory_reservations
      set status = 'released', updated_at = now()
      where id = v_reservation.id and status = 'reserved';

    if not found then
      continue;
    end if;

    update public.products
      set stock_quantity = stock_quantity + v_reservation.quantity,
          updated_at = now()
      where id = v_reservation.product_id;

    insert into public.inventory_movements (
      product_id, quantity_delta, movement_type, reference, notes
    ) values (
      v_reservation.product_id,
      v_reservation.quantity,
      'release',
      v_reservation.order_number,
      'Expired unpaid guest-order reservation released'
    );

    update public.orders o
      set order_status = 'cancelled', updated_at = now()
      where o.id = v_reservation.order_id
        and o.payment_status <> 'paid'
        and o.order_status = 'pending'
        and not exists (
          select 1
          from public.inventory_reservations remaining
          where remaining.order_id = o.id and remaining.status = 'reserved'
        );

    v_released := v_released + 1;
  end loop;

  return v_released;
end;
$$;

revoke all on function private.release_expired_inventory_reservations(integer) from public, anon, authenticated;

commit;
