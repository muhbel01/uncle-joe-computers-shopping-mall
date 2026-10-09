-- Staff-only catalogue access and atomic inventory adjustments.
-- Keep privileged inventory logic in the non-exposed private schema.

create policy "Staff can view all products"
on public.products for select to authenticated
using (private.has_staff_role(array['super_admin','manager','inventory_staff','order_staff']));

create policy "Managers can create products"
on public.products for insert to authenticated
with check (private.has_staff_role(array['super_admin','manager']));

create policy "Managers can update products"
on public.products for update to authenticated
using (private.has_staff_role(array['super_admin','manager']))
with check (private.has_staff_role(array['super_admin','manager']));

create policy "Managers can delete products"
on public.products for delete to authenticated
using (private.has_staff_role(array['super_admin','manager']));

create policy "Staff can view all categories"
on public.categories for select to authenticated
using (private.has_staff_role(array['super_admin','manager','inventory_staff','order_staff']));

create policy "Staff can view all product images"
on public.product_images for select to authenticated
using (private.has_staff_role(array['super_admin','manager','inventory_staff','order_staff']));

create or replace function private.adjust_inventory(
  p_product_id uuid,
  p_quantity_delta integer,
  p_movement_type text,
  p_reference text default null,
  p_notes text default null
)
returns table(product_id uuid, stock_quantity integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_current_stock integer;
  v_new_stock integer;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not private.has_staff_role(array['super_admin','manager','inventory_staff']) then
    raise exception 'Insufficient staff permissions' using errcode = '42501';
  end if;
  if p_quantity_delta is null or p_quantity_delta = 0 then
    raise exception 'Quantity change must be non-zero' using errcode = '22023';
  end if;
  if p_movement_type not in ('opening_balance','restock','return','damage','correction') then
    raise exception 'Unsupported inventory movement type' using errcode = '22023';
  end if;
  if p_movement_type in ('opening_balance','restock','return') and p_quantity_delta < 0 then
    raise exception 'This movement type requires a positive quantity change' using errcode = '22023';
  end if;
  if p_movement_type = 'damage' and p_quantity_delta > 0 then
    raise exception 'Damage must reduce stock' using errcode = '22023';
  end if;

  select p.stock_quantity into v_current_stock
  from public.products p where p.id = p_product_id for update;
  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;

  v_new_stock := v_current_stock + p_quantity_delta;
  if v_new_stock < 0 then
    raise exception 'Stock cannot become negative' using errcode = '22003';
  end if;

  update public.products set stock_quantity = v_new_stock, updated_at = now() where id = p_product_id;
  insert into public.inventory_movements (product_id, quantity_delta, movement_type, reference, notes, performed_by)
  values (p_product_id, p_quantity_delta, p_movement_type, nullif(left(coalesce(p_reference, ''), 120), ''),
    nullif(left(coalesce(p_notes, ''), 1000), ''), v_actor);
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, details)
  values (v_actor, 'inventory.adjusted', 'product', p_product_id::text,
    jsonb_build_object('quantity_delta', p_quantity_delta, 'movement_type', p_movement_type,
      'previous_stock', v_current_stock, 'new_stock', v_new_stock));
  return query select p_product_id, v_new_stock;
end;
$$;

revoke all on function private.adjust_inventory(uuid, integer, text, text, text) from public, anon;
grant execute on function private.adjust_inventory(uuid, integer, text, text, text) to authenticated;