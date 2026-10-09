-- Uncle Joe Computers Shopping Mall — initial schema
-- PostgreSQL / Supabase. All exposed tables have RLS enabled.

create extension if not exists pgcrypto;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  sku text unique,
  brand text,
  short_description text,
  description text,
  condition text not null default 'new' check (condition in ('new','used','refurbished')),
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  warranty_description text,
  return_eligible boolean not null default false,
  serial_tracking_required boolean not null default false,
  is_active boolean not null default false,
  is_featured boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, storage_path)
);

create table public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  recipient_name text not null,
  phone text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  postal_code text,
  delivery_notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','manager','inventory_staff','order_staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  delivery_address jsonb not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  total numeric(12,2) not null check (total >= 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  order_status text not null default 'pending' check (order_status in ('pending','confirmed','processing','ready_for_dispatch','shipped','delivered','cancelled','return_requested','returned')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','failed','partially_refunded','refunded')),
  payment_method text check (payment_method in ('paystack','bank_transfer','ussd','pay_on_delivery','cash_at_shop')),
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  sku text,
  condition text not null check (condition in ('new','used','refurbished')),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  warranty_snapshot text,
  created_at timestamptz not null default now()
);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'paystack' check (provider in ('paystack','bank_transfer','ussd','pay_on_delivery','cash_at_shop')),
  provider_reference text unique,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  status text not null default 'initiated' check (status in ('initiated','pending','successful','failed','abandoned','refunded')),
  provider_response jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_delta integer not null check (quantity_delta <> 0),
  movement_type text not null check (movement_type in ('opening_balance','restock','sale','return','damage','correction')),
  reference text,
  notes text,
  performed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index products_category_active_idx on public.products(category_id, is_active);
create index products_name_search_idx on public.products using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(sku,'')));
create index products_featured_idx on public.products(is_featured) where is_active = true;
create index product_images_product_sort_idx on public.product_images(product_id, sort_order);
create index customer_addresses_user_idx on public.customer_addresses(user_id);
create index orders_customer_idx on public.orders(customer_user_id, created_at desc);
create index orders_status_idx on public.orders(order_status, created_at desc);
create index order_items_order_idx on public.order_items(order_id);
create index payment_attempts_order_idx on public.payment_attempts(order_id, created_at desc);
create index inventory_movements_product_idx on public.inventory_movements(product_id, created_at desc);

-- Staff authorization helper is kept outside the exposed public schema.
create schema if not exists private;
create or replace function private.has_staff_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_members sm
    where sm.user_id = (select auth.uid())
      and sm.is_active = true
      and sm.role = any(allowed_roles)
  );
$$;
revoke all on function private.has_staff_role(text[]) from public;
grant usage on schema private to authenticated;
grant execute on function private.has_staff_role(text[]) to authenticated;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.staff_members enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.audit_logs enable row level security;

-- Public browsing is read-only. Mutations go through trusted server-side code/admin routes.
create policy "Active categories are publicly readable"
on public.categories for select to anon, authenticated using (is_active = true);

create policy "Active products are publicly readable"
on public.products for select to anon, authenticated using (is_active = true);

create policy "Images of active products are publicly readable"
on public.product_images for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = product_id and p.is_active = true)
);

create policy "Customers can read own profile"
on public.customer_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "Customers can create own profile"
on public.customer_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Customers can update own profile"
on public.customer_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Customers can manage own addresses"
on public.customer_addresses for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Staff can view staff directory"
on public.staff_members for select to authenticated
using (private.has_staff_role(array['super_admin','manager','inventory_staff','order_staff']));

create policy "Customers can read own orders"
on public.orders for select to authenticated using ((select auth.uid()) = customer_user_id);
create policy "Order staff can read all orders"
on public.orders for select to authenticated using (private.has_staff_role(array['super_admin','manager','order_staff']));

create policy "Customers can read own order items"
on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and o.customer_user_id = (select auth.uid()))
);
create policy "Order staff can read all order items"
on public.order_items for select to authenticated using (private.has_staff_role(array['super_admin','manager','order_staff']));

create policy "Order staff can view payment attempts"
on public.payment_attempts for select to authenticated
using (
  private.has_staff_role(array['super_admin','manager','order_staff'])
  or exists (select 1 from public.orders o where o.id = order_id and o.customer_user_id = (select auth.uid()))
);

create policy "Inventory staff can view inventory movements"
on public.inventory_movements for select to authenticated
using (private.has_staff_role(array['super_admin','manager','inventory_staff']));

create policy "Managers can view audit logs"
on public.audit_logs for select to authenticated
using (private.has_staff_role(array['super_admin','manager']));

-- Deliberately no client write policies for orders, payments, inventory, or audit logs.
-- Implement these operations in trusted server-side code after payment verification and validation.
