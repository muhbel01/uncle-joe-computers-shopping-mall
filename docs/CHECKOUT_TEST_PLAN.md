# Checkout Verification Plan

## Safety boundary

- Keep the checkout form in preview mode until these checks pass.
- Do not apply checkout migrations to the existing connected database for test purposes.
- Use an isolated Supabase development branch/project. Confirm any hourly cost before creating it.
- Keep guest checkout disabled until a store owner explicitly configures fulfilment and approves launch.
- Never use real customer or payment data in tests.

## Application validation

- [ ] Malformed JSON returns HTTP 400 without exposing server details.
- [ ] Missing or malformed request key returns HTTP 400.
- [ ] Missing customer name/phone, invalid phone/email, or oversized fields return HTTP 400.
- [ ] A valid email such as `buyer@example.com` passes database validation; an invalid domain format is rejected.
- [ ] Delivery without address, city, or state returns HTTP 400.
- [ ] Pickup requests do not require a delivery address.
- [ ] Empty carts, more than 50 lines, duplicate product IDs, non-UUID product IDs, and fractional/zero/negative/over-limit quantities are rejected.
- [ ] Extra/unexpected fields are rejected by the request schema.

## Database migration and transactional behaviour

- [ ] Both migrations apply cleanly to an isolated database built from the repository's initial schema.
- [ ] Checkout is rejected while the global guest-checkout setting is disabled.
- [ ] Pickup is rejected until pickup is enabled.
- [ ] Delivery is rejected until delivery and a non-negative flat delivery fee are configured.
- [ ] A valid order uses prices and currency from the database, never client-supplied totals.
- [ ] Order items preserve product name, SKU, condition, unit price, line total, and warranty snapshots.
- [ ] Stock is reserved atomically and an inventory movement is recorded for each line.
- [ ] A cart with insufficient stock creates no order and changes no stock.
- [ ] A cart containing an inactive or missing product creates no order and changes no stock.
- [ ] Repeating the same request key does not create a second order or reserve stock twice.
- [ ] Concurrent requests for the same request key result in one order.
- [ ] Concurrent carts competing for the last unit cannot oversell.
- [ ] Expired unpaid pending reservations restore stock exactly once and cancel the order when all its reservations are released.
- [ ] Paid or non-pending orders are never cancelled or released by the expiry routine.
- [ ] Direct client access to checkout settings and reservation rows is denied.
- [ ] The public RPC cannot call unrelated privileged routines or expose database internals.

## Before production

- [ ] Run Supabase security advisors and review the configured exposed schemas and function grants.
- [ ] Add an abuse/rate-limit strategy for the public checkout endpoint.
- [ ] Implement and test payment initiation and server-side payment verification/webhooks before claiming online payment support.
- [ ] Configure a trusted scheduler for expired reservations and alert on repeated failures.
- [ ] Add a clear privacy notice and retention policy for guest customer data.
- [ ] Test success, stock conflict, disabled checkout, and server-error states in the browser.
- [ ] Confirm the actual retailer's branding, delivery policy, fees, stock, terms, and launch approval.
