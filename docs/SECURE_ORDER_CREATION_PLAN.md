# Secure Order Creation — Implementation Plan

## Current status

The checkout page remains preview-only and is not connected to order submission. A draft POST route and database migration now exist on `feature/reusable-store-branding`, but the migration has not been applied or tested against an isolated database. Do not accept real orders yet.

Repository database inspection (17 October 2026) found existing `orders`, `order_items`, and `payment_attempts` tables with row-level security enabled. Their current policies permit customers to read their own orders but do not provide a public order-creation path. The products table currently has zero rows. The security advisor returned no findings in this check; this does not replace an application security review.

## Required architecture

1. **Validate input on the server.** Use the installed Zod package to validate name, phone, optional email, fulfilment method, delivery address fields, notes, and a bounded list of product UUIDs and positive integer quantities. Do not trust browser-provided product names, SKU, prices, stock, currency, totals, or delivery fees.
2. **Use an atomic database transaction.** Prefer a Postgres function that validates active products, locks relevant product rows in a deterministic order, verifies stock, snapshots product name/SKU/condition/price/warranty into `order_items`, computes subtotal on the server, creates the order, and decrements stock only if the order flow is explicitly designed to reserve stock. Any failure must roll back the entire transaction.
3. **Add idempotency.** Generate an opaque checkout request key on the server or accept a validated idempotency key, store it with a unique constraint scoped to the store, and return the existing result for safe retries. Do not rely on disabling the submit button alone.
4. **Keep database privileges narrow.** No direct anonymous inserts into `orders`, `order_items`, `inventory_movements`, or `payment_attempts`. The current draft migration exposes `public.create_guest_order(jsonb)` as a `SECURITY DEFINER` RPC to support guest checkout. This is a known security-review item: before enabling checkout, either move the privileged implementation into the non-exposed `private` schema behind a narrowly granted wrapper or document and verify why the public privileged entry point is safe. Keep a fixed search path, validate every input, and run Supabase security advisors.
5. **Separate order placement from payment.** Create an order as unpaid/pending, then initialize Paystack only from the server. Verify payment status server-side or from a verified webhook before marking an order paid. Never trust a browser redirect or client-submitted payment status.
6. **Treat fulfilment separately.** Delivery fee calculation needs explicit service areas and pricing rules. Pickup must not require an address. Until these rules are configured, the checkout must clearly show that final delivery cost is confirmed by the store.
7. **Protect customer data.** Do not log full phone numbers, email addresses, or delivery addresses. Add rate limiting/abuse controls and a privacy notice before launch. Do not add customer account requirements without a deliberate product decision.

## Database fields to review before migration

The existing `orders` table includes customer contact, JSON delivery address, subtotal, delivery fee, discount, total, currency, order status, payment status/method, and customer note. The `order_items` table includes product snapshots, quantity, unit price and line total. The `payment_attempts` table has provider, reference, amount, currency and status.

Before implementation, decide and migrate:
- An idempotency key with a unique constraint.
- Explicit fulfilment method (delivery or pickup); do not infer it from whether an address happens to be present.
- Whether stock is reserved at order creation or deducted only after a defined confirmation/payment event. The current draft reserves stock for 30 minutes and includes a private release routine, but no scheduler is configured yet; reservations will not expire automatically until a trusted scheduled job invokes `private.release_expired_inventory_reservations(100)`.
- A unique, non-guessable order number generation strategy.
- Whether unauthenticated guest orders are supported and how customers can securely look up an order.
- Any audit/event record required for stock changes and order status transitions.

## Test matrix before enabling submission

- Reject malformed payloads, invalid UUIDs, zero/negative/fractional quantities, excessive line counts, and oversized text.
- Reject inactive, missing, duplicate, or insufficient-stock products.
- Ignore altered client prices and totals; assert server-derived snapshots and totals.
- Run two simultaneous attempts for the last unit; never oversell.
- Retry the same idempotency key; create no duplicate order or stock movement.
- Force a line-item insert failure; verify no partial order or stock change remains.
- Verify anonymous users cannot read or modify other orders or payment attempts.
- Verify failed, pending, replayed, and forged payment callbacks cannot mark an order paid.
- Confirm all tests use a dedicated test project or isolated fixtures; do not create fake products/orders in the live project.

## Implementation status (17 October 2026)

- Added `app/api/orders/route.ts`; it validates the request and calls the draft RPC, but the checkout page does not call this endpoint.
- Added a draft atomic-order migration with server-side price/stock checks, idempotency, item snapshots, and stock reservations.
- Added `private.release_expired_inventory_reservations(integer)` to restore expired unpaid reservations and record a stock movement. It is not scheduled yet. The connected Supabase project reports `pg_cron` as available but not installed; no schema changes have been made to that project.
- Latest GitHub CI run: type check and lint passed; production build was still running at last inspection. SQL syntax, concurrency, RLS, and privilege behavior remain unverified in an isolated database.

## Release gate

Do not enable order submission or payments until the schema change is reviewed, backend implementation and tests pass, RLS/privilege checks pass, delivery rules are configured, and an authorised retailer has approved the live deployment. This repository is being prepared as a reusable template; it is not evidence of permission to deploy for Uncle Joe Computers Shopping Mall.
