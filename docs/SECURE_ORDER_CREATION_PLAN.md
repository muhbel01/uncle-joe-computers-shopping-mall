# Secure Order Creation — Implementation and Release Status

Last reviewed: 24 October 2026.

## Current status

The checkout form is connected to `POST /api/orders`. The route validates request data with Zod and calls the `create_guest_order` database RPC. The SQL migrations and transaction tests run against a disposable PostgreSQL 17 database in GitHub Actions. At commit `962e2070a7e26ae237941526f917b98ff95459fc`, both CI workflows passed, including type checking, lint, production build, request tests and PostgreSQL integration tests.

**The connected Supabase project has not been migrated for guest checkout, and live order submission is not ready.** The new checkout migration has only been applied to the isolated CI database. The store checkout settings default to disabled. Do not enable checkout or payments until the remaining release gates below have been completed and an authorised store owner has approved launch.

The repository is a reusable store template. It is not evidence of permission to deploy under Uncle Joe Computers Shopping Mall's identity.

## Implemented

- Server-side validation of checkout payloads.
- Database-side active-product, price, stock and fulfilment validation.
- Atomic order and order-item creation with product snapshots and stock reservations.
- Idempotency for retries using a request key.
- Fail-closed store settings; checkout, pickup and delivery default to disabled.
- A reservation-release routine that restores stock and cancels eligible expired unpaid orders.
- CI integration tests for server-derived totals, duplicate retries, fractional quantities, insufficient stock, inactive and missing products, rollback after forced order-item failure, concurrency/oversell protection, repeated expiry processing, and disabled checkout.
- Checkout form success/error states and explicit unpaid-order messaging.
- Customer-facing catalogue search, category/condition filters and sorting.

## Architecture and security requirements

1. **Never trust browser totals.** Product IDs and integer quantities are sent by the browser; the server/database must derive prices, currency, product snapshots, fees and totals.
2. **Use atomic transactions.** Validate active products, lock product rows in deterministic order, verify stock, create order and items, and reserve stock in one transaction. Any failure must roll back.
3. **Keep idempotency.** Repeated submissions with the same request key must return the original result and must not reserve stock twice.
4. **Keep database privileges narrow.** No direct anonymous inserts into orders, order items, inventory movements, or payment attempts. Verify grants, exposed schemas, RLS and security advisors in the target Supabase project.
5. **Keep payment separate.** An order is unpaid until Paystack (or another approved provider) is verified server-side or by a verified webhook. Never trust a browser redirect or client-supplied payment state.
6. **Configure fulfilment deliberately.** Pickup must not require an address. Delivery requires approved pricing and coverage rules. Current checkout schema supports a flat delivery fee, not service-area pricing.
7. **Protect customer data.** Do not log customer phone numbers, emails or addresses. Add rate limiting/abuse controls, privacy notice and retention policy before launch.
8. **Schedule reservation expiry.** The release routine is not yet scheduled in the connected project. Configure and test a trusted scheduled job before relying on automatic stock release.
9. **Require retailer approval.** Store identity, inventory, delivery policy, fees, terms and launch must be approved by the retailer.

## Remaining release gates

- [ ] Apply migrations to a dedicated development Supabase project only after confirming cost and explicit approval.
- [ ] Test RPC privileges, RLS, exposed schemas and security advisor findings in the target configuration.
- [ ] Add rate limiting or an abuse-control strategy for the public order endpoint.
- [ ] Configure and verify reservation expiry scheduling and failure alerting.
- [x] Test concurrent requests for the same idempotency key and competing carts for the final stock unit in isolated PostgreSQL CI.
- [x] Test rollback after a forced order-item failure and verify no partial order or stock change remains in isolated PostgreSQL CI.
- [ ] Test the full customer journey in a browser using a dedicated non-production database and clearly fake fixtures.
- [ ] Configure payment initiation, server-side verification and idempotent webhook handling before accepting online payments.
- [ ] Define delivery coverage, delivery fees, pickup instructions, privacy notice, return policy and customer support.
- [ ] Provision and test an authorised staff account; verify staff role boundaries and image uploads.
- [ ] Confirm the owner/retailer has authorised the brand and production deployment.

## Operational rule

Do not apply checkout migrations to the existing connected database just for testing. Do not create fake products, customer records or orders in production. Keep guest checkout disabled until all release gates are passed.
