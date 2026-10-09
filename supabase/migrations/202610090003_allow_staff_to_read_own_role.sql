-- Allow an authenticated user to read only their own staff assignment.
-- This is required for the server-side admin guard to distinguish staff from customers.
create policy "Staff can view their own role"
on public.staff_members
for select
to authenticated
using ((select auth.uid()) = user_id);
