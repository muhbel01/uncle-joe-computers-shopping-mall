# Database Schema Reconciliation — Checkout Readiness

**Status:** Investigation only. No live schema changes were made.

## What was verified

The connected Supabase project currently records these migrations:

- `20261009070437 initial_commerce_schema`
- `20261009070831 seed_initial_categories`
- `20261009151558 allow_staff_to_read_own_role`
- `20261009153026 staff_catalogue_inventory_controls`
- `20261009153034 expose_staff_inventory_rpc`
- `20261009153211 restrict_direct_product_stock_writes`
- `20261009153536 index_foreign_key_audit_columns`
- `20261009153623 secure_product_image_storage`
- `20261011005905 crm_customers_and_activity_timeline`
- `20261011010047 allow_inventory_staff_draft_products`
- `20261011161436 index_crm_actor_foreign_keys`

The first migration's expected file path,
`supabase/migrations/20261009070437_initial_commerce_schema.sql`, returned 404 on both `main` and `feature/reusable-store-branding`. The connected database therefore has migration-history records that are not currently matched by that expected repository file. Do not assume the repository migrations directory is a complete or authoritative replay of the live database.

## Checkout-relevant live schema facts

Read-only inspection found:

- `public.orders`, `public.order_items`, `public.payment_attempts`, and `public.products` exist and have row-level security enabled.
- The live `orders` table has `delivery_address` as non-null JSONB, but does not yet have `fulfilment_method` or `checkout_request_key`.
- No checkout-request-key index was found in the live schema.
- The live order policies currently permit authenticated customers to read their own orders and order items, and authorised order staff to read them. There is no public order-creation policy.
- The products table currently contains zero rows. Do not insert demonstration inventory or orders into the connected project as part of validation.
- The latest Supabase security advisor check returned no findings. This is not a substitute for application-level security review.

## Safe next steps

1. Recover the original SQL migrations from version control, backups, or the original deployment source, and compare them with the live schema. Do not reconstruct an initial migration from assumptions.
2. Decide the intended guest-checkout and stock-reservation model before adding database functions or privileges.
3. Review the draft migration `20261017090000_checkout_idempotency_and_fulfilment.sql` against the reconciled schema. It is a proposal only and has **not** been applied to Supabase.
4. Implement order creation as one atomic database transaction that validates active products, derives prices and totals from the database, checks stock under row locks, and safely handles duplicate requests.
5. Test in a dedicated development/test Supabase project with isolated fixtures. Verify rollback, concurrent stock contention, idempotent retries, and RLS/privilege boundaries.
6. Enable real order submission only after the migration source is reconciled, tests pass, delivery rules are configured, and an authorised retailer approves deployment.

## Explicit non-goals

This investigation does not enable order submission, change payment status, reserve stock, add public database write permissions, or authorise deployment for Uncle Joe Computers Shopping Mall. The codebase is being prepared as a reusable store template.
