# Inventory CSV Import Guide

Use this guide with `public/inventory-import-template.csv` when preparing the first real catalogue for Uncle Joe Computers Shopping Mall.

## Before preparing the sheet

- Enter real products the shop intends to sell. Do not upload example or placeholder products as real stock.
- Confirm the selling price in Nigerian naira (NGN), actual condition, and quantity physically available.
- Keep a copy of the original spreadsheet for your records.
- Uploads are limited to 250 product rows and 900 KB.
- Imported products are created as drafts, never published automatically. Review each draft, product details, stock and images before publishing.

## Required columns

| Column | What to enter |
|---|---|
| `name` | Product name (2–160 characters) |
| `condition` | Exactly `new`, `used`, or `refurbished` |
| `price_ngn` | Selling price as a number, without the naira symbol or thousands separators |
| `opening_stock` | Whole number representing the quantity physically available now |

## Optional columns

- `category_slug`: one of the exact values below. Leave blank if unsure.
- `sku`: shop's unique stock code. Avoid reusing codes.
- `brand`: product brand.
- `compare_at_price_ngn`: reference price only when accurate and supportable.
- `short_description`: short customer-facing summary (up to 240 characters).
- `description`: more detailed, accurate product information (up to 5,000 characters).
- `warranty_description`: only state warranty terms confirmed by the supplier/shop.
- `return_eligible`: `true` or `false`.
- `serial_tracking_required`: `true` or `false` where serial tracking is needed.
- `low_stock_threshold`: whole number; defaults to 3 when blank.
- `is_active` and `is_featured`: accepted in the file format but ignored during import. Imported products always remain inactive drafts until an authorised person reviews and publishes them.
- `image_file_names`: reference notes only; images are uploaded separately through the product image manager.

## Valid category slugs

- `accessories`
- `cctv-security`
- `computers-laptops`
- `gaming-entertainment`
- `networking`
- `phones-tablets`
- `power-solar`
- `printers-office`
- `smart-home`
- `storage-memory`

## Example row — illustrative only

This row demonstrates the format; it is not a real product and should not be imported as shop inventory.

```csv
computers-laptops,"REPLACE WITH REAL PRODUCT NAME",YOUR-SKU,BRAND,new,250000,,Short accurate summary,"Verified specifications and included accessories",Supplier-confirmed warranty,false,false,3,0,false,false,
```

Replace every example value with verified product information. If there is no confirmed warranty, leave the warranty field blank rather than making a promise. Do not claim a product is new, available or warrantied unless the shop has verified it.

## After import

1. Review the import summary and resolve skipped rows.
2. Inspect every draft for the correct name, category, price, condition and SKU.
3. Verify opening stock against the physical count and check any stock errors.
4. Upload the correct product images and confirm you have permission to use them.
5. Confirm warranty and return terms with the shop owner.
6. Publish only approved, genuinely available products.

CSV import does not activate checkout, online payment or delivery. Those must be implemented and tested separately before accepting online orders or payments.
