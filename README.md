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
- Public storefront, catalogue, category, product detail, cart, and product search/filter/sort are implemented.
- Staff email/password login and server-side role checks are implemented; a real staff account still needs to be provisioned and end-to-end tested.
- The staff product/inventory workspace supports product creation and editing, draft/published status, low-stock thresholds, stock movements, and a product register.
- Managers can upload and remove JPG, PNG and WebP product images (maximum 5 MB each) through a role-restricted Supabase Storage bucket; published product images display in the storefront.
- Checkout form is connected to the order API but is hidden unless `NEXT_PUBLIC_CHECKOUT_ENABLED=true` is explicitly configured. The default is false, and this public UI flag does not enable the database checkout setting. Checkout migrations and core transactional tests pass in an isolated PostgreSQL 16 GitHub Actions job; verify the latest CI run before relying on newer changes.
- The connected Supabase project has not been migrated for guest checkout. Guest checkout defaults to disabled; do not accept live orders.
- No product inventory has been imported yet. The catalogue should remain empty until a verified real inventory sheet is supplied.
- Paystack/payment verification, production end-to-end checkout tests, scheduled reservation expiry, delivery rules, production security review, staff provisioning and WhatsApp support are not production-ready.
- See `docs/SECURE_ORDER_CREATION_PLAN.md`, `docs/CHECKOUT_TEST_PLAN.md`, and `docs/REUSABLE_STOREFRONT_LAUNCH_CHECKLIST.md` for release gates.

## Reusing this storefront for another retailer

This codebase can be adapted into a reusable store template. Before creating a retailer-specific deployment:

1. Get permission to use the retailer's name, logo, product images and other brand assets.
2. Set `NEXT_PUBLIC_STORE_NAME`, `NEXT_PUBLIC_STORE_SHORT_NAME`, `NEXT_PUBLIC_STORE_TAGLINE`, `NEXT_PUBLIC_STORE_DESCRIPTION`, `NEXT_PUBLIC_STORE_LOCATION` and `NEXT_PUBLIC_SITE_URL` for that deployment. The site URL must be the real canonical HTTPS domain before launch; the localhost fallback is for development only.
3. Confirm currency, language and locale, then review the homepage category links against the categories actually enabled in that store's database.
4. Configure the correct Supabase project and storage bucket for the store. Never copy production secrets into a template or commit them to Git.
5. Import only verified inventory with the correct condition (new, used or refurbished), prices and stock counts. Keep the catalogue empty until that data is approved.
6. Leave `NEXT_PUBLIC_CHECKOUT_ENABLED=false` until the database checkout settings, fulfilment rules, payment verification and production end-to-end tests have all been reviewed and approved.
7. Run `npm run typecheck`, `npm run lint` and `npm run build`; verify the GitHub Actions checks before deployment.

The environment variables brand the public UI and metadata; they do not automatically customise database categories, payment configuration, inventory or legal policies. Each retailer needs a separate configuration and launch review.

## Important implementation rules
- Recalculate prices and stock on the server; never trust totals supplied by a browser.
- Verify Paystack payments server-side and process webhooks idempotently. The payment-confirmation path must lock the order row, refuse to mark a cancelled order paid, and coordinate with reservation expiry before any payment flow is enabled.
- Do not expose service-role or payment secret keys to the client.
- Review RLS policies and test access boundaries before production.
- Never add fabricated products or stock counts to make the storefront look populated.
