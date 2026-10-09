create index if not exists audit_logs_actor_user_idx on public.audit_logs(actor_user_id);
create index if not exists inventory_movements_performed_by_idx on public.inventory_movements(performed_by);
create index if not exists order_items_product_idx on public.order_items(product_id);