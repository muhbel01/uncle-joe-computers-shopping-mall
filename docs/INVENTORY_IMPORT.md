# Inventory Import Preparation

This guide prepares the shop's existing stock list for a controlled catalogue import. No sample products or stock quantities are invented in this repository.

## Files

- `inventory-import-template.csv` — blank UTF-8 CSV template. Copy it and fill one row per distinct sellable product/variant.
- Keep your original spreadsheet unchanged and work on a copy.

## Required fields

- `category_slug`: one of the existing category slugs below.
- `name`: customer-facing product name.
- `condition`: exactly `new`, `used`, or `refurbished`.
- `price_ngn`: numeric amount in naira only (for example `250000`; no currency symbol or thousands separators).
- `opening_stock`: count physically verified before go-live. Use a non-negative whole number. Do not guess stock.
- `is_active`: use `false` until price, condition, warranty, stock and photos have been reviewed. Publish only approved rows.

## Existing category slugs

| Category | Slug |
|---|---|
| Accessories | `accessories` |
| CCTV & Security | `cctv-security` |
| Computers & Laptops | `computers-laptops` |
| Gaming & Entertainment | `gaming-entertainment` |
| Networking | `networking` |
| Phones & Tablets | `phones-tablets` |
| Power & Solar | `power-solar` |
| Printers & Office | `printers-office` |
| Smart Home | `smart-home` |
| Storage & Memory | `storage-memory` |

## Data rules

- Keep SKUs unique. If no SKU exists, leave it blank until the shop assigns one.
- Leave `compare_at_price_ngn` blank unless there is a genuine higher reference price.
- Use `true` or `false` for `return_eligible`, `serial_tracking_required`, `is_active`, and `is_featured`.
- Use a non-negative whole number for `low_stock_threshold` and `opening_stock`.
- Keep product descriptions factual. Confirm laptop specifications, battery health, cosmetic condition, included accessories, warranty terms, and refurbished/used status.
- `image_file_names` is a note for matching product photos during a later upload; it does not upload files by itself.
- Avoid commas inside numeric values. Standard CSV quoting should be used for text fields containing commas, quotes, or line breaks.

## Safe import sequence

1. Reconcile the spreadsheet against a physical stock count and confirm the selling price with the owner.
2. Check duplicate SKUs and near-duplicate product names.
3. Review used/refurbished condition, warranty, and return eligibility for each item.
4. Upload the reviewed CSV from **Admin → Products & inventory → Import inventory from CSV**. The importer accepts up to 250 rows and 900 KB per file. Required headers: `name`, `condition`, `price_ngn`, and `opening_stock`.
5. The importer creates every product as an unpublished draft, regardless of CSV `is_active` or `is_featured` values. Valid opening stock is recorded through the audited `adjust_inventory` workflow; never write `products.stock_quantity` directly.
6. Review the import summary. Fix skipped rows and investigate any opening-stock adjustment errors before continuing. Duplicate SKUs within the file and invalid rows are skipped; existing unique-constraint conflicts are also skipped.
7. Upload and verify product images through the admin image manager, test the product page, and publish only after the product details, price, condition, stock, warranty and photo have been checked.

## Current limitations

The importer creates draft products and records opening stock, but does not upload images or publish products. Run a controlled test with a small, reviewed CSV first and reconcile the resulting stock ledger before a full import. Online checkout and payments remain disabled until their separate implementation and end-to-end checks are complete.
