# Reusable Store Setup

This repository is being prepared as a reusable e-commerce foundation for small and medium retailers. The codebase may contain historical references to Uncle Joe Computers Shopping Mall; do not present that business as a customer, partner, or approved deployment without written permission.

## Configure a new retailer

Set these environment variables for the intended deployment:

- `NEXT_PUBLIC_STORE_NAME`: full customer-facing store name.
- `NEXT_PUBLIC_STORE_SHORT_NAME`: short brand text used in compact areas.
- `NEXT_PUBLIC_STORE_DESCRIPTION`: accurate store description for metadata.
- `NEXT_PUBLIC_SITE_URL`: canonical HTTPS URL for the deployment.
- `NEXT_PUBLIC_STORE_LOCALE`: Open Graph locale, such as `en_NG`.
- `NEXT_PUBLIC_STORE_LANGUAGE`: HTML language, such as `en-NG`.
- `NEXT_PUBLIC_STORE_CURRENCY`: ISO currency code. The current inventory and checkout plan is Nigeria-first and uses NGN.
- `NEXT_PUBLIC_STORE_LOCATION`: approved public-facing location text.

Never place secret keys in `NEXT_PUBLIC_*` variables. Keep Supabase service-role keys, payment secret keys, and webhook secrets server-side.

## Before launching for any retailer

1. Obtain written permission to use the retailer's name, logo, product photos, descriptions, and policies.
2. Configure an authorised Supabase project and apply reviewed migrations.
3. Create staff accounts only for authorised people and verify role boundaries.
4. Import verified stock, prices, product condition, warranty and return details.
5. Configure customer contact details, delivery rules, privacy notice, terms and refund/returns policy.
6. Test cart, order creation, stock concurrency, payment callbacks/webhooks, failed payments, refunds and notifications in a sandbox.
7. Confirm production approval in writing before accepting live orders or payments.

## Productisation status

Brand configuration is in progress. The existing database and storefront are not yet a complete multi-tenant SaaS platform; separate retailer deployments are the initial target. Checkout, order management, payment processing and delivery rules remain separate milestones. No production credentials or real inventory should be copied between retailers.
