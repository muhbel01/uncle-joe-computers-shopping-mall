-- Cover CRM actor foreign keys flagged by the Supabase performance advisor.
-- These indexes improve joins and parent-row maintenance as CRM activity grows.
create index if not exists crm_activities_performed_by_idx
  on public.crm_activities (performed_by);

create index if not exists crm_customers_created_by_idx
  on public.crm_customers (created_by);
