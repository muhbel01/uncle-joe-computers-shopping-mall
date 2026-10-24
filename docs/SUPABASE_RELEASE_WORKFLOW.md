# Supabase Database Change and Release Workflow

This repository uses Supabase Postgres, Auth and Storage. Treat the connected project as a real database: application code, migration files and the remote schema must stay aligned.

## Current verified baseline (2026-10-23)

- Connected project: `uncle-joe-computers-shopping-mall` (`dyhicczuymgxfxfotdbg`), region `eu-west-1`, PostgreSQL 17.
- Row Level Security is enabled on all 13 tables currently present in the `public` schema.
- The Supabase security advisor returned no security findings during the latest review.
- The database migration history currently includes migrations through `20261011171500_index_crm_actor_foreign_keys`.
- The repository contains two later checkout migrations (`20261017090000_checkout_idempotency_and_fulfilment.sql` and `20261017120000_atomic_guest_order_creation.sql`) that are **not applied** to the connected project. Keep checkout disabled until these changes are reviewed, tested and deliberately released.

Re-check the live project before relying on this snapshot; it will become stale after subsequent changes.

## Required workflow for schema changes

1. **Inspect first.** Read the affected schema, policies, grants, functions, triggers and existing migrations. Confirm the current remote migration history and whether the change is destructive.
2. **Use a development environment.** Prefer a Supabase development branch or disposable local database. Never use the production project as the first test environment. Check and confirm any non-zero branch/compute cost before creating a branch.
3. **Create migrations with the Supabase CLI.** Discover the installed CLI version and supported commands with `supabase --version` and `supabase migration --help`; create new migration files with `supabase migration new <descriptive_name>`. Do not invent a timestamp or overwrite an already-applied migration.
4. **Make migrations repeatable and reviewable.** Keep schema changes in version-controlled SQL files. Do not make an untracked dashboard/SQL-editor change and assume Git contains it. If SQL is used to iterate in development, capture the final reviewed change as a migration before release.
5. **Test from a clean database.** Apply migrations in order with errors treated as fatal. Test expected schema, constraints, grants, RLS policies, functions and negative access cases. For checkout, test stock locking, idempotent retries, invalid input, insufficient stock, reservation expiry and disabled-by-default behaviour.
6. **Run checks.** Review Supabase security and performance advisors; resolve security findings and investigate warnings. Verify migration history and generated application types where schema changes affect TypeScript.
7. **Release deliberately.** Review the exact migration diff, backup/recovery plan and deployment order. Apply only after the isolated tests pass and the release is approved. Do not enable customer checkout or payment processing merely because a migration was applied.
8. **Verify after release.** Query the resulting schema and migration history, rerun advisors, test the relevant application path and confirm that no secrets have entered browser bundles or Git.

## Security rules

- Enable RLS on every table in an exposed schema such as `public`; use policies tailored to the intended access model and least-privilege grants.
- A role such as `authenticated` is not, by itself, an ownership or staff-authorisation check. Use explicit row ownership or trusted staff-role checks.
- Do not use user-editable Auth user metadata for authorization decisions.
- Never expose Supabase secret/service-role keys or payment-provider secrets in browser code or `NEXT_PUBLIC_*` variables. Use a publishable key in client code and keep privileged credentials server-side.
- Treat `SECURITY DEFINER` functions as privileged API endpoints. Pin `search_path`, fully qualify object names, validate inputs, revoke default public execution, and grant execution only to intended roles.
- Keep stock changes inside audited transactional database routines. Do not directly write `products.stock_quantity` from application code.
- Keep guest checkout disabled until migration release, payment verification, webhook idempotency, cancellation/expiry handling and production end-to-end tests have all passed.

## Repository test environment

The checkout integration workflow runs against a disposable PostgreSQL service. Keep its major version aligned with the connected Supabase project's PostgreSQL major version, and never point this job at production credentials. The CI database is a test fixture, not proof that the connected Supabase project has received those migrations.
