# Technical foundation — v1

## Product
Uncle Joe Computers Shopping Mall is a Nigeria-focused retailer based in Osogbo, Osun State. The site supports the physical shop and online orders, new and used goods, local and nationwide delivery, and staff-managed inventory.

## Proposed stack
- Next.js App Router, React, TypeScript
- Tailwind CSS
- Supabase Postgres, Auth, and Storage
- Paystack for online payments
- GitHub for source control; Vercel for hosting
- Linear for work tracking

## Core design rules
1. Treat the database as the source of truth for price, stock, order status, payment status, and staff permissions.
2. Separate order state from payment state.
3. Verify payment status server-side using Paystack verification/webhooks. Never trust a browser redirect as proof of payment.
4. Make payment webhook handling idempotent; repeated notifications must not create duplicate fulfilment or stock deductions.
5. Do not expose Supabase service-role keys or Paystack secret keys to browsers or mobile apps.
6. Enable Row Level Security for exposed tables and write policies based on least privilege.
7. Keep an audit trail for stock movements and important admin actions.
8. Support guest checkout; do not require an account to place an order.
9. Model condition (new/used/refurbished), warranty, return eligibility, and serial/IMEI tracking per product or item where appropriate.
10. Treat return requests as conditional and reviewable; do not promise unrestricted returns.
11. Use Nigerian Naira, Nigerian phone numbers, and delivery addresses suitable for local and nationwide delivery.
12. Design for low-bandwidth mobile use and prevent overselling during concurrent checkouts.

## Planned domain areas
- Catalogue: categories, products, product images, condition, attributes, variants
- Inventory: locations, stock balances, stock movements, serial/IMEI records where needed
- Customers: profiles and addresses, with guest checkout support
- Commerce: carts, cart items, orders, order items
- Payments: payment attempts, provider references, webhook event/idempotency records, refunds
- Fulfilment: delivery options, shipments, tracking events
- After-sales: warranty terms, return requests, refund decisions
- Administration: staff profiles, roles/permissions, audit logs
- Engagement: reviews, notifications, WhatsApp contact entry point

## MVP sequence
1. Repository and app foundation
2. Architecture review and database schema approval
3. Catalogue and inventory administration
4. Storefront catalogue and product pages
5. Cart and guest checkout
6. Orders and payment integration
7. Delivery, after-sales, notifications
8. Security review, tests, deployment

## Open decisions
- Brand logo, colours, and slogan
- Final delivery pricing/rules
- Exact pay-on-delivery coverage and limits
- Exact conditional return windows and exclusions
- Warranty wording by product/brand
- Whether the existing inventory data can be imported and in what format
- Which staff roles may approve refunds, adjust stock, and change prices

## Secrets
Use `.env.example` as the template. Keep real credentials in local environment variables or hosting secrets. Never commit `.env`, Supabase service-role keys, Paystack secret keys, or webhook secrets.
