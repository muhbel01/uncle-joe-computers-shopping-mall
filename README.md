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
The initial schema is in `supabase/migrations/202610090001_initial_schema.sql` and has been applied to the connected Supabase project. It covers the catalogue, customer profiles/addresses, staff roles, orders, order items, payment attempts, inventory movements and audit logs. Row Level Security is enabled on all public tables. Order/payment/inventory writes are intentionally reserved for trusted server-side code.

## Current status
The storefront landing page and responsive styling are committed. This is still a starter UI with placeholder catalogue content. Checkout, admin CRUD, inventory workflows, authentication UI, payment processing, shipping calculations, product imports and WhatsApp support are not yet production-ready.

## Important implementation rules
- Recalculate prices and stock on the server; never trust totals supplied by a browser.
- Verify Paystack payments server-side and process webhooks idempotently.
- Do not expose service-role or payment secret keys to the client.
- Review RLS policies and test access boundaries before production.
