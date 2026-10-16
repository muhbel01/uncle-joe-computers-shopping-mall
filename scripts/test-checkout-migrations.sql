-- Ephemeral PostgreSQL integration tests for the guest checkout migrations.
-- Uses synthetic records only. Run after all repository migrations on a disposable database.

\set ON_ERROR_STOP on

do $$
declare
  v_product uuid := gen_random_uuid();
  v_key uuid := gen_random_uuid();
  v_bad_key uuid := gen_random_uuid();
  v_short_key uuid := gen_random_uuid();
  v_disabled_key uuid := gen_random_uuid();
  v_first record;
  v_retry record;
  v_stock integer;
  v_order_count integer;
  v_released integer;
  v_rejected boolean;
begin
  insert into public.products (
    id, name, slug, sku, condition, price, stock_quantity, is_active
  ) values (
    v_product, 'Integration Test Laptop', 'integration-test-laptop',
    'TEST-LAPTOP-001', 'new', 1250, 5, true
  );

  update public.checkout_settings
  set guest_checkout_enabled = true,
      pickup_enabled = true,
      delivery_enabled = false,
      default_delivery_fee = null
  where id = true;

  select * into v_first
  from public.create_guest_order(jsonb_build_object(
    'requestKey', v_key::text,
    'customer', jsonb_build_object(
      'name', 'Test Buyer',
      'phone', '08012345678',
      'email', 'buyer@example.com'
    ),
    'fulfilmentMethod', 'pickup',
    'deliveryAddress', jsonb_build_object('address', '', 'city', '', 'state', ''),
    'customerNote', 'Automated integration test',
    'items', jsonb_build_array(jsonb_build_object(
      'productId', v_product::text, 'quantity', 2
    ))
  ));

  if v_first.order_id is null or v_first.order_number is null
     or v_first.order_total <> 2500 or v_first.currency <> 'NGN' then
    raise exception 'TEST FAILED: valid order returned unexpected values';
  end if;

  select stock_quantity into v_stock
  from public.products where id = v_product;
  if v_stock <> 3 then
    raise exception 'TEST FAILED: expected stock 3 after reservation, got %', v_stock;
  end if;

  select * into v_retry
  from public.create_guest_order(jsonb_build_object(
    'requestKey', v_key::text,
    'customer', jsonb_build_object(
      'name', 'Test Buyer',
      'phone', '08012345678',
      'email', 'buyer@example.com'
    ),
    'fulfilmentMethod', 'pickup',
    'deliveryAddress', jsonb_build_object('address', '', 'city', '', 'state', ''),
    'customerNote', 'Automated integration test retry',
    'items', jsonb_build_array(jsonb_build_object(
      'productId', v_product::text, 'quantity', 2
    ))
  ));

  if v_retry.order_id <> v_first.order_id then
    raise exception 'TEST FAILED: idempotent retry returned a different order';
  end if;

  select stock_quantity into v_stock
  from public.products where id = v_product;
  if v_stock <> 3 then
    raise exception 'TEST FAILED: idempotent retry changed stock';
  end if;

  select count(*) into v_order_count
  from public.orders where checkout_request_key = v_key;
  if v_order_count <> 1 then
    raise exception 'TEST FAILED: idempotent retry created % orders', v_order_count;
  end if;

  v_rejected := false;
  begin
    perform * from public.create_guest_order(jsonb_build_object(
      'requestKey', v_bad_key::text,
      'customer', jsonb_build_object('name', 'Test Buyer', 'phone', '08012345678', 'email', 'buyer@example.com'),
      'fulfilmentMethod', 'pickup',
      'deliveryAddress', jsonb_build_object('address', '', 'city', '', 'state', ''),
      'items', jsonb_build_array(jsonb_build_object('productId', v_product::text, 'quantity', 1.5))
    ));
  exception when sqlstate '22023' then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'TEST FAILED: fractional quantity was not rejected';
  end if;

  v_rejected := false;
  begin
    perform * from public.create_guest_order(jsonb_build_object(
      'requestKey', v_short_key::text,
      'customer', jsonb_build_object('name', 'Test Buyer', 'phone', '08012345678', 'email', 'buyer@example.com'),
      'fulfilmentMethod', 'pickup',
      'deliveryAddress', jsonb_build_object('address', '', 'city', '', 'state', ''),
      'items', jsonb_build_array(jsonb_build_object('productId', v_product::text, 'quantity', 50))
    ));
  exception when sqlstate 'P0001' then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'TEST FAILED: insufficient stock was not rejected';
  end if;

  select stock_quantity into v_stock
  from public.products where id = v_product;
  if v_stock <> 3 then
    raise exception 'TEST FAILED: rejected order changed stock';
  end if;

  update public.inventory_reservations
  set expires_at = now() - interval '1 minute'
  where order_id = v_first.order_id and status = 'reserved';

  select private.release_expired_inventory_reservations(100) into v_released;
  if v_released <> 1 then
    raise exception 'TEST FAILED: expected one expired reservation released, got %', v_released;
  end if;

  select stock_quantity into v_stock
  from public.products where id = v_product;
  if v_stock <> 5 then
    raise exception 'TEST FAILED: stock was not restored after reservation expiry';
  end if;

  if not exists (
    select 1 from public.orders
    where id = v_first.order_id and order_status = 'cancelled'
  ) then
    raise exception 'TEST FAILED: expired unpaid order was not cancelled';
  end if;

  update public.checkout_settings
  set guest_checkout_enabled = false
  where id = true;

  v_rejected := false;
  begin
    perform * from public.create_guest_order(jsonb_build_object(
      'requestKey', v_disabled_key::text,
      'customer', jsonb_build_object('name', 'Test Buyer', 'phone', '08012345678', 'email', 'buyer@example.com'),
      'fulfilmentMethod', 'pickup',
      'deliveryAddress', jsonb_build_object('address', '', 'city', '', 'state', ''),
      'items', jsonb_build_array(jsonb_build_object('productId', v_product::text, 'quantity', 1))
    ));
  exception when sqlstate '55000' then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'TEST FAILED: checkout succeeded while globally disabled';
  end if;

  raise notice 'PASS: migration execution, valid order, server-side totals, idempotency, fractional quantity rejection, insufficient stock rollback, reservation expiry, and disabled checkout';
end
$$;
