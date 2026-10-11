drop policy if exists "Managers can create products" on public.products;
create policy "Managers and inventory staff can create products" on public.products
for insert to authenticated
with check (
  private.has_staff_role(ARRAY['super_admin','manager'])
  or (
    private.has_staff_role(ARRAY['inventory_staff'])
    and is_active = false
    and is_featured = false
  )
);
