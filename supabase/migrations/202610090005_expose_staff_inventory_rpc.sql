-- Authenticated clients can call the inventory RPC through PostgREST.
-- The wrapper is invoker-rights; the private implementation performs role checks.
create or replace function public.adjust_inventory(
  p_product_id uuid,
  p_quantity_delta integer,
  p_movement_type text,
  p_reference text default null,
  p_notes text default null
)
returns table(product_id uuid, stock_quantity integer)
language sql
security invoker
set search_path = ''
as $$
  select * from private.adjust_inventory(
    p_product_id, p_quantity_delta, p_movement_type, p_reference, p_notes
  );
$$;

revoke all on function public.adjust_inventory(uuid, integer, text, text, text) from public, anon;
grant execute on function public.adjust_inventory(uuid, integer, text, text, text) to authenticated;