#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL must point to a disposable PostgreSQL test database}"
psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 <<'SQL'
UPDATE public.checkout_settings SET guest_checkout_enabled=true, pickup_enabled=true, delivery_enabled=false, default_delivery_fee=NULL WHERE id=true;
SQL
new_product() {
  local stock="$1"
  psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -c "INSERT INTO public.products (name,slug,condition,price,stock_quantity,is_active) VALUES ('Concurrent Checkout Test','concurrency-' || gen_random_uuid()::text,'new',1000,$stock,true) RETURNING id;"
}
new_key() { psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -c "SELECT gen_random_uuid();"; }
run_checkout() {
  local product_id="$1" request_key="$2" output_file="$3" payload
  payload=$(printf '{"requestKey":"%s","customer":{"name":"Concurrency Test","phone":"08012345678","email":"concurrency@example.com"},"fulfilmentMethod":"pickup","deliveryAddress":{},"items":[{"productId":"%s","quantity":1}]}' "$request_key" "$product_id")
  psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -c "SELECT order_id FROM public.create_guest_order(\$payload\$${payload}\$payload\$::jsonb);" >"$output_file" 2>&1
}
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
# Two simultaneous requests share one idempotency key.
same_product="$(new_product 5)"
same_key="$(new_key)"
run_checkout "$same_product" "$same_key" "$tmp_dir/same-a.out" & pid_a=$!
run_checkout "$same_product" "$same_key" "$tmp_dir/same-b.out" & pid_b=$!
if ! wait "$pid_a"; then cat "$tmp_dir/same-a.out"; echo "FAIL: first same-key request failed" >&2; exit 1; fi
if ! wait "$pid_b"; then cat "$tmp_dir/same-b.out"; echo "FAIL: second same-key request failed" >&2; exit 1; fi
order_a="$(tr -d '\r\n' < "$tmp_dir/same-a.out")"
order_b="$(tr -d '\r\n' < "$tmp_dir/same-b.out")"
[[ -n "$order_a" && "$order_a" == "$order_b" ]] || { echo "FAIL: same-key requests returned different/empty order IDs" >&2; cat "$tmp_dir/same-a.out" "$tmp_dir/same-b.out"; exit 1; }
same_count="$(psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.orders WHERE checkout_request_key='$same_key'::uuid;")"
same_stock="$(psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -c "SELECT stock_quantity FROM public.products WHERE id='$same_product'::uuid;")"
[[ "$same_count" == "1" && "$same_stock" == "4" ]] || { echo "FAIL: same-key count=$same_count stock=$same_stock (expected 1 and 4)" >&2; exit 1; }
echo "PASS: concurrent same-key retries returned one order and reserved stock once"
# Two distinct requests race for one remaining unit.
last_product="$(new_product 1)"
key_a="$(new_key)"; key_b="$(new_key)"
run_checkout "$last_product" "$key_a" "$tmp_dir/last-a.out" & pid_a=$!
run_checkout "$last_product" "$key_b" "$tmp_dir/last-b.out" & pid_b=$!
successes=0; failures=0
if wait "$pid_a"; then successes=$((successes+1)); else failures=$((failures+1)); fi
if wait "$pid_b"; then successes=$((successes+1)); else failures=$((failures+1)); fi
last_stock="$(psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -c "SELECT stock_quantity FROM public.products WHERE id='$last_product'::uuid;")"
last_orders="$(psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.orders WHERE checkout_request_key IN ('$key_a'::uuid,'$key_b'::uuid);")"
[[ "$successes" == "1" && "$failures" == "1" && "$last_stock" == "0" && "$last_orders" == "1" ]] || { echo "FAIL: last-unit race successes=$successes failures=$failures stock=$last_stock orders=$last_orders" >&2; cat "$tmp_dir/last-a.out" "$tmp_dir/last-b.out"; exit 1; }
echo "PASS: concurrent distinct requests competing for the last unit cannot oversell"
