insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Managers can upload product images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and private.has_staff_role(array['super_admin','manager'])
  and exists (
    select 1 from public.products p
    where p.id::text = (storage.foldername(name))[1]
  )
);

create policy "Managers can delete product images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and private.has_staff_role(array['super_admin','manager'])
  and exists (
    select 1 from public.products p
    where p.id::text = (storage.foldername(name))[1]
  )
);

create policy "Managers can add product image records"
on public.product_images for insert to authenticated
with check (private.has_staff_role(array['super_admin','manager']));

create policy "Managers can remove product image records"
on public.product_images for delete to authenticated
using (private.has_staff_role(array['super_admin','manager']));