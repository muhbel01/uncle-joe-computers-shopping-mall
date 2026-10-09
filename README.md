# Uncle Joe Computers Shopping Mall

A Nigeria-focused e-commerce storefront for computers, laptops, phones, accessories, networking, security, entertainment and power products. Based in Osogbo, Osun State, with nationwide delivery planned.

## Stack
- Next.js App Router + React + TypeScript
- Tailwind CSS
- Supabase Postgres, Auth and Storage
- Paystack integration planned (server-side verification and idempotent webhooks required before accepting online payments)

## Local development
1. Install Node.js 20.9 or newer.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in the public Supabase URL/key.
4. Start the development server: `npm run dev`
5. Check types: `npm run typecheck`; lint: `npm run lint`; build: `npm run build`

## Environment variables
See `.env.example`. Never commit real `.env.local` files, service-role keys, Paystack secret keys or webhook secrets. Only browser-safe values may use the `NEXT_PUBLIC_` prefix.

## Database
Migrations are stored in `supabase/migrations/`. The connected Supabase project has the initial schema, seeded categories, staff self-role access, staff catalogue policies and inventory adjustment RPC applied. Row Level Security is enabled on public tables. Product creation is restricted to super admins/managers. Inventory adjustments are restricted to super admins, managers and inventory staff; stock changes use a row lock and record an inventory movement plus audit-log entry in one database transaction.

## Current status
- Public storefront, catalogue, category, search and product-detail routes are implemented.
- Staff email/password login and server-side role checks are implemented; a real staff account still needs to be provisioned and end-to-end tested.
- The staff product/inventory workspace supports product creation, draft/published status, low-stock thresholds, stock movements and a product register.
- No product inventory has been imported yet. The product list is intentionally empty until the real inventory sheet is supplied.
- Checkout, order creation, Paystack, shipping calculations, image uploads, staff provisioning and WhatsApp support are not production-ready.

## Important implementation rules
- Recalculate prices and stock on the server; never trust totals supplied by a browser.
- Verify Paystack payments server-side and process webhooks idempotently.
- Do not expose service-role or payment secret keys to the client.
- Review RLS policies and test access boundaries before production.
- Never add fabricated products or stock counts to make the storefront look populated.
