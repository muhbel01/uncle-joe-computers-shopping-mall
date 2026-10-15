import Link from "next/link";
import { requireStaff } from "@/lib/admin/require-staff";
import { importProductsCsv } from "../import-actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string; imported?: string; skipped?: string; stockErrors?: string }>;

export default async function ProductImportPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, role } = await requireStaff(["super_admin", "manager", "inventory_staff"]);
  const params = await searchParams;
  const errorText: Record<string, string> = {
    file: "Choose a CSV file smaller than 900 KB.",
    csv: "The CSV has invalid quoting. Check the file and try again.",
    rows: "The file must contain a header and 1–250 product rows.",
    headers: "Required headers are missing, or a header is duplicated. Required: name, condition, price_ngn, opening_stock.",
  };
  return <main className="page-shell"><section className="container page-heading admin-products">
    <Link href="/admin/products" className="back-link">← Products & inventory</Link>
    <span className="eyebrow">CATALOGUE · BULK ENTRY</span>
    <h1>Import inventory CSV</h1>
    <p>Signed in as {user.email ?? "authorised staff"} · {role.replaceAll("_", " ")}. Upload a reviewed stock sheet to create product drafts and record opening stock through the inventory audit workflow.</p>
    {params.error && errorText[params.error] && <p className="admin-flash error" role="alert">{errorText[params.error]}</p>}
    {params.imported !== undefined && <div className="admin-flash success" role="status">
      <strong>Import completed.</strong> Draft products created: {params.imported}. Rows skipped: {params.skipped ?? "0"}. Opening stock adjustments that need review: {params.stockErrors ?? "0"}.
      <p>Review every draft, confirm photos and prices, then publish approved products. A stock adjustment error leaves that product at zero stock.</p>
    </div>}
    <section className="admin-panel">
      <h2>Before you upload</h2>
      <ul>
        <li>Use the provided inventory CSV template and keep the original spreadsheet as a backup.</li>
        <li>Maximum 250 product rows and 900 KB per upload.</li>
        <li>Every imported product stays unpublished as a draft, regardless of CSV flags.</li>
        <li>Opening stock is recorded as a separate audited movement; quantities are not written directly into stock fields.</li>
        <li>Duplicate SKUs within the same file and invalid rows are skipped. Existing duplicate SKUs or slugs are also skipped.</li>
        <li>Import photos separately through the product image manager after reviewing the drafts.</li>
      </ul>
      <form action={importProductsCsv} className="admin-data-form">
        <label className="span-two">Inventory CSV file<input name="file" type="file" accept=".csv,text/csv" required /></label>
        <button className="admin-submit" type="submit">Import as drafts</button>
      </form>
      <p className="panel-help"><a href="/inventory-import-template.csv" download>Download the inventory CSV template ↓</a> · <a href="/inventory-import-guide.md" target="_blank" rel="noreferrer">Read the import guide ↗</a></p><p className="panel-help">Required fields: name, condition (new, used or refurbished), price_ngn and opening_stock. Use exact category slugs from the category list below; leave category_slug blank if unsure.</p><details className="admin-help"><summary>Valid category slugs</summary><ul><li>accessories</li><li>cctv-security</li><li>computers-laptops</li><li>gaming-entertainment</li><li>networking</li><li>phones-tablets</li><li>power-solar</li><li>printers-office</li><li>smart-home</li><li>storage-memory</li></ul></details>
      <p><Link href="/admin/products">Return to product register</Link></p>
    </section>
  </section></main>;
}
