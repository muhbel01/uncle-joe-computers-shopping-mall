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
- [x] Expiry leaves a paid order's payment and order statuses unchanged.
- [x] Checkout is rejected while guest checkout is disabled.
- [x] Insufficient-stock checkout leaves no order behind.
- [x] Order-item snapshots preserve product name, SKU, condition, unit price, line total and warranty.

## Covered by automated request tests

- [x] Zod schema validation for valid delivery/pickup, IDs, delivery address, phone/email, duplicate products, quantities, cart size and unexpected fields.
- [x] Non-JSON content type is rejected with HTTP-helper status 415.
- [x] Malformed JSON is rejected with HTTP-helper status 400.
- [x] Declared oversized request is rejected with HTTP-helper status 413.
- [x] Streamed oversized body is rejected with HTTP-helper status 413 even without Content-Length.

These tests exercise the request parsing helper and schema directly, not the full Next.js route or a running browser session.

## Additional application/API validation

- [x] Checkout handler integration tests cover invalid customer fields, response JSON, RPC error mapping and safe failures using injected test dependencies. (Full browser E2E remains outstanding.)
- [x] Extracted API response tests verify safe error mapping and valid unpaid-order response formatting.
- [x] Unknown database errors are mapped to a generic response without exposing internal error details.
- [ ] Rate limiting and abuse controls are implemented and tested.

## Database and security tests still required

- [x] Concurrent requests using the same request key create only one order (isolated PostgreSQL concurrency test).
- [x] Concurrent carts competing for the last unit cannot oversell (isolated PostgreSQL concurrency test).
- [x] A forced order-item insert failure rolls back the order, stock changes, reservations and inventory movement (isolated PostgreSQL integration test).
- [x] Missing and inactive products are rejected without leaving partial orders in the isolated PostgreSQL integration test.
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
