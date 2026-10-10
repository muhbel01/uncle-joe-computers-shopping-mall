# Administrator Setup — Uncle Joe Computers Shopping Mall

This guide provisions the first authorised staff account. Do not enable public staff registration.

## 1. Create the account in Supabase Auth

1. Open the project dashboard: https://supabase.com/dashboard/project/dyhicczuymgxfxfotdbg
2. Go to **Authentication → Users**.
3. Choose **Add user** and create an account using an email address controlled by the shop administrator.
4. Use a strong, unique password and require the user to change it or use the password-reset flow before normal use.
5. Copy the user's Auth UUID from the Users list. Do not share the password in chat, tickets, or source control.

## 2. Grant the first Super Admin role

In **SQL Editor**, run the following after replacing the placeholder with the UUID of the account you just created. Do not run it with a made-up UUID.

```sql
insert into public.staff_members (user_id, role, is_active)
values ('REPLACE_WITH_AUTH_USER_UUID'::uuid, 'super_admin', true);
```

This statement intentionally uses INSERT rather than an upsert that could silently change an existing staff member's role. If it reports a duplicate key, inspect the existing staff row and resolve it deliberately.

## 3. Verify the role

Run this query in SQL Editor and confirm that the email/UUID is the intended administrator and the role is `super_admin`.

```sql
select u.id, u.email, sm.role, sm.is_active
from auth.users u
join public.staff_members sm on sm.user_id = u.id
where u.id = 'REPLACE_WITH_AUTH_USER_UUID'::uuid;
```

## 4. Test access

1. Visit `/admin/login` on the deployed site.
2. Sign in with the new account.
3. Confirm the admin dashboard and product/inventory workspace load.
4. Create one real product as a **draft**; do not publish placeholder products.
5. Record opening stock using the audited stock-movement form.
6. Upload a product photo and verify it appears in the storefront only after the product is published.
7. Test logout and confirm protected admin pages require a valid session.

## Staff roles

- `super_admin`: full authorised administration.
- `manager`: manage catalogue and product images, plus permitted management functions.
- `inventory_staff`: record stock movements and view inventory; cannot manage product details.
- `order_staff`: reserved for order operations when those features are implemented.

## Security requirements

- Never put Supabase service-role/secret keys or payment secrets in browser code, GitHub, or this document.
- Never grant a staff role based on a browser-submitted role or editable user metadata.
- Create staff accounts only for approved personnel; disable access by setting `is_active = false` when staff leave.
- Checkout and payment processing are not production-ready. Do not accept online payments until server-side validation, Paystack verification, idempotent webhook handling, and end-to-end tests are completed.
