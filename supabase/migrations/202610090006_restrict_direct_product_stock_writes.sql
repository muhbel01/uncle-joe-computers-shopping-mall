-- Prevent direct Data API writes to stock_quantity. Stock can only change through
-- the atomic, audited inventory RPC. Product insert/update permissions are column-scoped.
revoke insert, update on table public.products from authenticated;

grant insert (
  category_id, name, slug, sku, brand, short_description, description, condition,
  price, compare_at_price, low_stock_threshold, warranty_description,
  return_eligible, serial_tracking_required, is_active, is_featured, metadata
) on table public.products to authenticated;

grant update (
  category_id, name, slug, sku, brand, short_description, description, condition,
  price, compare_at_price, low_stock_threshold, warranty_description,
  return_eligible, serial_tracking_required, is_active, is_featured, metadata, updated_at
) on table public.products to authenticated;
