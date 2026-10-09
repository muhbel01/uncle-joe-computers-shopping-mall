import Link from "next/link";
import { requireStaff } from "@/lib/admin/require-staff";
import { createProduct, updateProduct, adjustStock } from "./actions";
import { ProductImageManager } from "@/components/admin/product-image-manager";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const roleLabels: Record<string, string> = {
  super_admin: "Super Admin", manager: "Manager", inventory_staff: "Inventory Staff", order_staff: "Order Staff",
};

type SearchParams = Promise<{ notice?: string; error?: string }>;

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, user, role } = await requireStaff(["super_admin", "manager", "inventory_staff"]);
  const params = await searchParams;
  const canManageProducts = role === "super_admin" || role === "manager";
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from("products").select("id,name,slug,category_id,sku,brand,condition,price,compare_at_price,stock_quantity,low_stock_threshold,warranty_description,short_description,description,is_active,is_featured")
      .order("updated_at", { ascending: false }).limit(100),
    supabase.from("categories").select("id,name").order("sort_order"),
  ]);
  const noticeText: Record<string, string> = {
    "product-created": "Product saved. Stock starts at zero; record the opening balance separately.",
    "product-updated": "Product details updated.",
    "stock-updated": "Stock adjustment recorded and audit trail updated.",
  };
  const errorText: Record<string, string> = {
    "invalid-product": "Some product fields are invalid. Review the form and try again.",
    "save-failed": "Product could not be saved. Check for a duplicate product slug or SKU.",
    "update-failed": "Product could not be updated. Check for a duplicate product slug or SKU.",
    "invalid-stock-change": "The stock adjustment is invalid. Quantity must be non-zero and match the movement type.",
    "stock-change-failed": "Stock was not changed. Check permissions, product selection and available stock.",
  };

  return <main className="page-shell"><section className="container page-heading admin-products">
    <Link href="/admin" className="back-link">← Admin dashboard</Link>
    <span className="eyebrow">CATALOGUE · INVENTORY</span>
    <h1>Products & inventory</h1>
    <p>Signed in as {user.email ?? "authorised staff"} · {roleLabels[role]}. Product prices are in NGN. Stock adjustments are recorded with an actor, reason and previous/new stock values.</p>
    {params.notice && noticeText[params.notice] && <p className="admin-flash success" role="status">{noticeText[params.notice]}</p>}
    {params.error && errorText[params.error] && <p className="admin-flash error" role="alert">{errorText[params.error]}</p>}

    {canManageProducts && <section className="admin-panel">
      <h2>Add a product</h2><p className="panel-help">New products are hidden from customers unless you select “Publish product”. Initial stock is entered separately below.</p>
      <form action={createProduct} className="admin-data-form">
        <label>Product name<input name="name" required minLength={2} maxLength={160} /></label>
        <label>Category<select name="category_id" defaultValue=""><option value="">Uncategorised</option>{(categories ?? []).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label>SKU<input name="sku" maxLength={80} /></label>
        <label>Brand<input name="brand" maxLength={100} /></label>
        <label>Condition<select name="condition" defaultValue="new"><option value="new">New</option><option value="used">Used</option><option value="refurbished">Refurbished</option></select></label>
        <label>Selling price (₦)<input name="price" type="number" min="0" step="0.01" required /></label>
        <label>Compare-at price (₦)<input name="compare_at_price" type="number" min="0" step="0.01" /></label>
        <label>Low-stock alert at<input name="low_stock_threshold" type="number" min="0" step="1" defaultValue="3" required /></label>
        <label>Warranty<input name="warranty_description" maxLength={500} placeholder="e.g. 6 months, supplier warranty" /></label>
        <label className="span-two">Short description<input name="short_description" maxLength={240} /></label>
        <label className="span-two">Full description<textarea name="description" rows={3} maxLength={5000} /></label>
        <label className="check-label"><input name="is_active" type="checkbox" /> Publish product</label>
        <label className="check-label"><input name="is_featured" type="checkbox" /> Feature on shop</label>
        <button className="admin-submit" type="submit">Save product</button>
      </form>
    </section>}

    <section className="admin-panel">
      <h2>Record a stock movement</h2><p className="panel-help">Use positive quantities for opening balance, restock and return. Use a negative quantity for damage. Corrections may be positive or negative.</p>
      <form action={adjustStock} className="admin-data-form">
        <label className="span-two">Product<select name="product_id" required defaultValue=""><option value="" disabled>Select product</option>{(products ?? []).map(product => <option key={product.id} value={product.id}>{product.name}{product.sku ? " · "+product.sku : ""} — stock: {product.stock_quantity}</option>)}</select></label>
        <label>Quantity change (+/-)<input name="quantity_delta" type="number" step="1" min="-100000" max="100000" required /></label>
        <label>Movement type<select name="movement_type" defaultValue="restock"><option value="opening_balance">Opening balance</option><option value="restock">Restock</option><option value="return">Return</option><option value="damage">Damage</option><option value="correction">Correction</option></select></label>
        <label>Reference<input name="reference" maxLength={120} placeholder="Invoice / delivery reference" /></label>
        <label className="span-two">Notes<textarea name="notes" rows={2} maxLength={1000} placeholder="Supplier, reason or supporting details" /></label>
        <button className="admin-submit" type="submit">Save stock movement</button>
      </form>
    </section>

    <section className="admin-panel">
      <div className="admin-panel-heading"><div><h2>Product register</h2><p className="panel-help">Showing up to 100 recently updated products.</p></div><span className="admin-count">{products?.length ?? 0} products</span></div>
      {(products?.length ?? 0) === 0 ? <p className="empty-state">No products have been imported or created yet. Upload the existing inventory sheet before entering real stock.</p> :
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>SKU / brand</th><th>Price</th><th>Stock</th><th>Status</th>{canManageProducts && <th>Actions</th>}</tr></thead>
          <tbody>{products!.map(product => <tr key={product.id}><td><strong>{product.name}</strong><small>/{product.slug}</small></td><td>{product.sku || "—"}<small>{product.brand || product.condition}</small></td><td>{money.format(Number(product.price))}</td><td><strong>{product.stock_quantity}</strong><small>{product.stock_quantity <= product.low_stock_threshold ? "Low stock" : "In stock"}</small></td><td><span className={product.is_active ? "status-pill active" : "status-pill"}>{product.is_active ? "Published" : "Draft"}</span></td>{canManageProducts && <td><ProductImageManager productId={product.id} productName={product.name} /><details className="admin-inline-edit"><summary>Edit</summary><form action={updateProduct} className="admin-edit-form">
            <input type="hidden" name="id" value={product.id} />
            <label>Product name<input name="name" defaultValue={product.name} required minLength={2} maxLength={160} /></label>
            <label>Category<select name="category_id" defaultValue={product.category_id ?? ""}><option value="">Uncategorised</option>{(categories ?? []).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>SKU<input name="sku" defaultValue={product.sku ?? ""} maxLength={80} /></label>
            <label>Brand<input name="brand" defaultValue={product.brand ?? ""} maxLength={100} /></label>
            <label>Condition<select name="condition" defaultValue={product.condition}><option value="new">New</option><option value="used">Used</option><option value="refurbished">Refurbished</option></select></label>
            <label>Selling price (₦)<input name="price" type="number" min="0" step="0.01" defaultValue={Number(product.price)} required /></label>
            <label>Compare-at price (₦)<input name="compare_at_price" type="number" min="0" step="0.01" defaultValue={product.compare_at_price ?? ""} /></label>
            <label>Low-stock alert at<input name="low_stock_threshold" type="number" min="0" defaultValue={product.low_stock_threshold} required /></label>
            <label>Warranty<input name="warranty_description" defaultValue={product.warranty_description ?? ""} maxLength={500} /></label>
            <label className="span-two">Short description<input name="short_description" defaultValue={product.short_description ?? ""} maxLength={240} /></label>
            <label className="span-two">Full description<textarea name="description" defaultValue={product.description ?? ""} rows={3} maxLength={5000} /></label>
            <label className="check-label"><input name="is_active" type="checkbox" defaultChecked={product.is_active} /> Publish product</label>
            <label className="check-label"><input name="is_featured" type="checkbox" defaultChecked={product.is_featured} /> Feature on shop</label>
            <button className="admin-submit" type="submit">Save changes</button>
          </form></details></td>}</tr>)}</tbody>
        </table></div>}
    </section>
    <form action="/admin/logout" method="post"><button className="admin-logout" type="submit">Sign out</button></form>
  </section></main>;
}
