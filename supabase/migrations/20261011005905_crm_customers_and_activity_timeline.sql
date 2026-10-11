create table if not exists public.crm_customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  phone text,
  email text,
  company text,
  customer_type text not null default 'retail' check (customer_type in ('retail','business','wholesale','corporate')),
  lifecycle_stage text not null default 'lead' check (lifecycle_stage in ('lead','prospect','customer','repeat_customer','inactive')),
  source text,
  preferred_contact text not null default 'whatsapp' check (preferred_contact in ('whatsapp','phone','email','in_person')),
  city text,
  state text,
  assigned_to uuid references auth.users(id) on delete set null,
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  internal_notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_customers_name_idx on public.crm_customers (lower(full_name));
create index if not exists crm_customers_phone_idx on public.crm_customers (phone);
create index if not exists crm_customers_stage_idx on public.crm_customers (lifecycle_stage);
create index if not exists crm_customers_followup_idx on public.crm_customers (next_follow_up_at) where next_follow_up_at is not null;
create index if not exists crm_customers_assigned_idx on public.crm_customers (assigned_to);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.crm_customers(id) on delete cascade,
  activity_type text not null check (activity_type in ('call','whatsapp','email','visit','purchase','complaint','follow_up','note')),
  summary text not null check (char_length(trim(summary)) between 2 and 2000),
  outcome text,
  follow_up_at timestamptz,
  performed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists crm_activities_customer_idx on public.crm_activities (customer_id, created_at desc);
create index if not exists crm_activities_followup_idx on public.crm_activities (follow_up_at) where follow_up_at is not null;

alter table public.crm_customers enable row level security;
alter table public.crm_activities enable row level security;
revoke all on public.crm_customers from anon, authenticated;
revoke all on public.crm_activities from anon, authenticated;
grant select, insert, update, delete on public.crm_customers to authenticated;
grant select, insert on public.crm_activities to authenticated;

drop policy if exists "CRM staff can view customers" on public.crm_customers;
create policy "CRM staff can view customers" on public.crm_customers for select to authenticated
using (private.has_staff_role(ARRAY['super_admin','manager','order_staff']));
drop policy if exists "CRM staff can create customers" on public.crm_customers;
create policy "CRM staff can create customers" on public.crm_customers for insert to authenticated
with check (private.has_staff_role(ARRAY['super_admin','manager','order_staff']) and (created_by is null or created_by = (select auth.uid())));
drop policy if exists "CRM staff can update customers" on public.crm_customers;
create policy "CRM staff can update customers" on public.crm_customers for update to authenticated
using (private.has_staff_role(ARRAY['super_admin','manager','order_staff']))
with check (private.has_staff_role(ARRAY['super_admin','manager','order_staff']));
drop policy if exists "Managers can delete CRM customers" on public.crm_customers;
create policy "Managers can delete CRM customers" on public.crm_customers for delete to authenticated
using (private.has_staff_role(ARRAY['super_admin','manager']));

drop policy if exists "CRM staff can view activities" on public.crm_activities;
create policy "CRM staff can view activities" on public.crm_activities for select to authenticated
using (private.has_staff_role(ARRAY['super_admin','manager','order_staff']));
drop policy if exists "CRM staff can create activities" on public.crm_activities;
create policy "CRM staff can create activities" on public.crm_activities for insert to authenticated
with check (private.has_staff_role(ARRAY['super_admin','manager','order_staff']) and (performed_by is null or performed_by = (select auth.uid())));

create or replace function public.set_crm_customer_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists crm_customers_set_updated_at on public.crm_customers;
create trigger crm_customers_set_updated_at before update on public.crm_customers
for each row execute function public.set_crm_customer_updated_at();

comment on table public.crm_customers is 'Staff-only CRM contact directory for leads, customers, assignments and follow-up reminders.';
comment on table public.crm_activities is 'Append-only staff CRM timeline for calls, WhatsApp, email, visits, purchases and notes.';
