# Reusable Storefront — Launch Readiness Checklist

Use this checklist for each retailer deployment. This project is a template, not automatic authorisation to use any retailer's name, images, inventory or policies.

## 1. Store identity and domain

- [ ] Get written approval to use the retailer's name, logo, product images and content.
- [ ] Set `NEXT_PUBLIC_STORE_NAME`, `NEXT_PUBLIC_STORE_SHORT_NAME`, `NEXT_PUBLIC_STORE_DESCRIPTION`, `NEXT_PUBLIC_STORE_CITY`, `NEXT_PUBLIC_STORE_STATE`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_STORE_CURRENCY`, `NEXT_PUBLIC_STORE_LOCALE`, `NEXT_PUBLIC_STORE_LANGUAGE`, `NEXT_PUBLIC_STORE_LOCATION`, and `NEXT_PUBLIC_STORE_TIME_ZONE` (use an IANA zone such as `Africa/Lagos`).
- [ ] Connect the approved domain and verify HTTPS.
- [ ] Replace demo branding and generic contact details with approved business details.
- [ ] Add approved privacy notice, terms, returns/refunds policy and support contact.

## 2. Supabase environment

- [ ] Use a separate Supabase project for local/test, staging and production as appropriate.
- [ ] Confirm project plan and recurring costs before creating branches or enabling paid features.
- [ ] Apply migrations through a reviewed, version-controlled process; do not test migrations against production.
- [ ] Configure only the public Supabase URL and publishable key as `NEXT_PUBLIC_*` variables.
- [ ] Store service-role and payment secrets only as server-side environment variables.
- [ ] Review RLS, function grants, exposed schemas, storage policies and security advisor results.
- [ ] Provision named staff accounts and verify each role's least-privilege access.

## 3. Product catalogue and stock

- [ ] Obtain the retailer's actual inventory sheet; do not fabricate products, prices or stock.
- [ ] Verify required import columns, unique product slugs/SKUs, category mapping and condition values (`new`, `used`, `refurbished`).
- [ ] Import products as unpublished drafts and review names, descriptions, prices, currency, condition, warranty and stock.
- [ ] Upload only authorised product images; verify file size/type and storage permissions.
- [ ] Publish a small verified set, then test search, category/condition filters, sorting and product detail pages.
- [ ] Confirm stock changes are audited and inventory cannot go negative.

## 4. Checkout and fulfilment

- [ ] Run `npm run typecheck`, `npm run lint`, `npm run build` and the PostgreSQL integration job.
- [ ] Complete browser end-to-end tests using non-production test data.
- [ ] Review rate limiting/abuse controls, request validation and customer-data logging.
- [ ] Approve pickup instructions and delivery service areas/pricing.
- [ ] Configure and test the scheduled expired-reservation release process.
- [ ] Confirm checkout is disabled until the authorised retailer deliberately approves and configures it.
- [ ] Never collect online payment until payment initialization, server-side verification and idempotent webhooks are implemented and tested.

## 5. Deployment and monitoring

- [ ] Deploy a preview and test on desktop and mobile.
- [ ] Check accessibility, page metadata, broken links, empty states and loading/error handling.
- [ ] Configure production environment variables in the hosting platform.
- [ ] Verify the production deployment uses the intended Git branch and Supabase project.
- [ ] Set up logs/alerts for failed checkout, database errors, stock release failures and payment webhook failures.
- [ ] Confirm backups, rollback steps and who is responsible for production support.
- [ ] Obtain final retailer sign-off before announcing the site or accepting real customer information/orders.

## Current project status (17 October 2026)

- Public storefront, product detail, cart and catalogue search/filter/sort are implemented.
- Checkout form is connected to the order API.
- Latest verified code commit (`1d828aef`) passed application type check, lint, production build and the isolated PostgreSQL checkout integration job. Subsequent documentation commits also passed GitHub Actions CI.
- The connected Supabase project has not been migrated for guest checkout. Guest checkout defaults to disabled.
- No actual inventory has been imported; the catalogue should remain empty until verified stock is provided.
- Payment collection, scheduled reservation release, production end-to-end tests and retailer launch approval remain outstanding.
