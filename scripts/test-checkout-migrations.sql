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
  v_paid_key uuid := gen_random_uuid();
  v_first record;
  v_paid record;
  v_retry record;
  v_stock integer;
  v_order_count integer;
  v_released integer;
  v_rejected boolean;
begin
  -- Verify the browser-facing role grants after migrations are applied.
  if not has_function_privilege('anon', 'public.create_guest_order(jsonb)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.create_guest_order(jsonb)', 'EXECUTE') then
    raise exception 'TEST FAILED: public guest-order RPC is not executable by browser roles';
  end if;

  if has_function_privilege('anon', 'private.create_guest_order(jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.create_guest_order(jsonb)', 'EXECUTE') then
    raise exception 'TEST FAILED: browser role can execute the private guest-order function';
  end if;

  if has_function_privilege('anon', 'private.release_expired_inventory_reservations(integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.release_expired_inventory_reservations(integer)', 'EXECUTE') then
    raise exception 'TEST FAILED: browser role can execute the private reservation-release function';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_guest_order'
      and p.prosecdef
      and 'search_path=""' = any(p.proconfig)
  ) then
    raise exception 'TEST FAILED: public guest-order RPC must be SECURITY DEFINER with an empty search_path';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'create_guest_order'
      and p.prosecdef
      and 'search_path=""' = any(p.proconfig)
  ) then
    raise exception 'TEST FAILED: private guest-order function must be SECURITY DEFINER with an empty search_path';
  end if;

  if has_table_privilege('anon', 'public.checkout_settings', 'SELECT')
     or has_table_privilege('anon', 'public.checkout_settings', 'INSERT')
     or has_table_privilege('anon', 'public.checkout_settings', 'UPDATE')
     or has_table_privilege('anon', 'public.checkout_settings', 'DELETE')
     or has_table_privilege('authenticated', 'public.checkout_settings', 'SELECT')
     or has_table_privilege('authenticated', 'public.checkout_settings', 'INSERT')
     or has_table_privilege('authenticated', 'public.checkout_settings', 'UPDATE')
     or has_table_privilege('authenticated', 'public.checkout_settings', 'DELETE') then
    raise exception 'TEST FAILED: browser role has direct privileges on checkout settings';
  end if;

  if has_table_privilege('anon', 'public.inventory_reservations', 'SELECT')
     or has_table_privilege('anon', 'public.inventory_reservations', 'INSERT')
     or has_table_privilege('anon', 'public.inventory_reservations', 'UPDATE')
     or has_table_privilege('anon', 'public.inventory_reservations', 'DELETE')
     or has_table_privilege('authenticated', 'public.inventory_reservations', 'SELECT')
     or has_table_privilege('authenticated', 'public.inventory_reservations', 'INSERT')
     or has_table_privilege('authenticated', 'public.inventory_reservations', 'UPDATE')
     or has_table_privilege('authenticated', 'public.inventory_reservations', 'DELETE') then
    raise exception 'TEST FAILED: browser role has direct privileges on inventory reservations';
  end if;

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

  -- Inactive products must not be purchasable, even when stock exists.
  update public.products set is_active = false where id = v_product;
  v_rejected := false;
  begin
    perform * from public.create_guest_order(jsonb_build_object(
      'requestKey', v_short_key::text,
      'customer', jsonb_build_object('name', 'Test Buyer', 'phone', '08012345678', 'email', 'buyer@example.com'),
      'fulfilmentMethod', 'pickup',
      'deliveryAddress', jsonb_build_object('address', '', 'city', '', 'state', ''),
      'items', jsonb_build_array(jsonb_build_object('productId', v_product::text, 'quantity', 1))
    ));
  exception when sqlstate 'P0002' then
    v_rejected := true;
  end;
  update public.products set is_active = true where id = v_product;
  if not v_rejected then
    raise exception 'TEST FAILED: inactive product was purchasable';
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

  -- Running the release routine again must not restore the same stock twice.
  select private.release_expired_inventory_reservations(100) into v_released;
  if v_released <> 0 then
    raise exception 'TEST FAILED: second expiry pass released % reservations', v_released;
  end if;
  select stock_quantity into v_stock from public.products where id = v_product;
  if v_stock <> 5 then
    raise exception 'TEST FAILED: repeated expiry pass changed stock to %', v_stock;
  end if;

  -- A paid order must never have its stock reservation released by expiry.
  select * into v_paid
  from public.create_guest_order(jsonb_build_object(
    'requestKey', v_paid_key::text,
    'customer', jsonb_build_object(
      'name', 'Paid Test Buyer',
      'phone', '08012345678',
      'email', 'paid-buyer@example.com'
    ),
    'fulfilmentMethod', 'pickup',
    'deliveryAddress', jsonb_build_object('address', '', 'city', '', 'state', ''),
    'customerNote', 'Paid-order reservation guard test',
    'items', jsonb_build_array(jsonb_build_object(
      'productId', v_product::text, 'quantity', 1
    ))
  ));

  update public.orders
  set payment_status = 'paid'
  where id = v_paid.order_id;

  update public.inventory_reservations
  set expires_at = now() - interval '1 minute'
  where order_id = v_paid.order_id and status = 'reserved';

  select private.release_expired_inventory_reservations(100) into v_released;
  if v_released <> 0 then
    raise exception 'TEST FAILED: expired reservation for paid order was released';
  end if;

  select stock_quantity into v_stock from public.products where id = v_product;
  if v_stock <> 4 then
    raise exception 'TEST FAILED: paid-order stock reservation was not preserved, stock is %', v_stock;
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

  raise notice 'PASS: migration execution, valid order, server-side totals, idempotency, fractional quantity rejection, insufficient stock rollback, inactive-product rejection, reservation expiry without double restoration, and disabled checkout';
end
$$;
