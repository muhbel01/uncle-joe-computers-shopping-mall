# Checkout Verification Plan

Last reviewed: 23 October 2026.

## Safety boundary

- [x] Checkout form submits to `POST /api/orders`.
- [x] The request is validated server-side and calls the atomic order-creation RPC.
- [x] Repository migrations and core transactional tests pass against an isolated PostgreSQL 17 database in GitHub Actions.
- [ ] Do not apply checkout migrations to the connected/live Supabase project for testing.
- [ ] Keep guest checkout disabled until an authorised store owner configures fulfilment and approves launch.
- [ ] Never use real customer or payment data in tests.

## Covered by isolated PostgreSQL integration tests

- [x] Migrations apply in order to a disposable database.
- [x] A valid order uses database prices and currency rather than browser-supplied totals.
- [x] Idempotent retry returns the same order without reserving stock twice.
- [x] Fractional quantities are rejected.
- [x] Insufficient stock is rejected without changing stock.
- [x] Inactive products are rejected.
- [x] Expired unpaid reservations restore stock and cancel the pending order.
- [x] A repeated expiry pass does not restore stock twice.
- [x] Checkout is rejected while guest checkout is disabled.
- [x] Insufficient-stock checkout leaves no order behind.
- [x] Order-item snapshots preserve product name, SKU, condition, unit price, line total and warranty.

## Covered by automated request-schema tests

These tests exercise the Zod schema directly; they do not yet exercise HTTP responses from the route.

- [x] Valid delivery payload is accepted.
- [x] Pickup payload may omit delivery address fields.
- [x] Invalid request key and product ID are rejected.
- [x] Delivery without address, city, or state is rejected.
- [x] Invalid phone and email values are rejected.
- [x] Duplicate products and invalid quantities are rejected.
- [x] Empty carts, carts over 50 lines and unexpected top-level fields are rejected.

## Additional application/API validation

- [ ] Malformed JSON returns HTTP 400 without exposing server details.
- [ ] Non-JSON content type returns HTTP 415.
- [ ] Checkout request bodies over 64 KiB return HTTP 413, including when the size is not declared in `Content-Length`.
- [ ] Invalid customer fields and oversized text fields return HTTP 400 at the HTTP boundary.
- [ ] User-visible API errors are helpful without exposing database internals.

## Database and security tests still required

- [ ] Concurrent requests using the same request key create only one order.
- [ ] Concurrent carts competing for the last unit cannot oversell.
- [ ] A forced order-item insert failure rolls back the order and stock changes.
- [ ] Missing and inactive products create no partial order.
- [ ] Paid or non-pending orders are never cancelled/released by reservation expiry.
- [ ] Anonymous clients cannot read or modify other orders, payment attempts, checkout settings or reservation rows.
- [ ] RPC privileges, exposed schemas, RLS policies and Supabase security advisors are reviewed in the intended project.
- [ ] A trusted scheduler invokes reservation expiry; errors are observable.
- [ ] With `NEXT_PUBLIC_CHECKOUT_ENABLED` unset or false, checkout displays a preparation message and does not ask for customer details.
- [ ] Setting `NEXT_PUBLIC_CHECKOUT_ENABLED=true` only reveals the form; the database must still reject order creation while its checkout setting is disabled.

## Browser end-to-end test

Use a dedicated non-production project and clearly fake fixtures.

- [ ] Browse products and open product detail.
- [ ] Search catalogue, filter by category and condition, and sort by price/name.
- [ ] Add an in-stock product to the cart; verify quantity controls and removal.
- [ ] Refresh and verify cart persistence.
- [ ] Submit invalid checkout details and verify field/API errors.
- [ ] Verify disabled checkout displays a safe message and does not clear the cart.
- [ ] With checkout deliberately enabled in the test environment, submit an order and verify exactly one unpaid order and expected stock reservation.
- [ ] Simulate a timeout and retry with the same request key.
- [ ] Confirm success clears the cart only after a valid server confirmation.

## Payment and production release

- [ ] Implement server-side payment initialization, verification and idempotent webhook handling before claiming online payments.
- [ ] Define delivery coverage, delivery fee rules, pickup instructions and return policy.
- [ ] Add privacy notice, retention policy and rate limiting/abuse controls.
- [ ] Confirm the retailer approves branding, inventory, policies and production launch.
- [ ] Provision and test authorised staff access and image-upload permissions.
- [ ] Keep checkout disabled until all applicable release gates pass.
