import Link from "next/link";

export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  condition: "new" | "used" | "refurbished";
  price: number;
  stock_quantity: number;
  warranty_description: string | null;
  category?: { name: string; slug: string } | null;
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function ProductGrid({ products }: { products: StoreProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="catalogue-placeholder">
        <span>✦</span>
        <strong>No products published yet</strong>
        <small>Our team is preparing the catalogue. Please check back soon or contact the shop for current availability.</small>
        <Link className="button secondary" href="/#contact">Contact the shop</Link>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <article className="product-card" key={product.id}>
          <div className="product-art" aria-hidden="true">UJ</div>
          <div className="product-card-body">
            {product.category?.name && <small className="product-category">{product.category.name}</small>}
            <h2><Link href={`/products/${product.slug}`}>{product.name}</Link></h2>
            <p className="product-meta">{product.brand || "Quality tech"} · {product.condition}</p>
            <strong className="product-price">{naira.format(product.price)}</strong>
            <small className={product.stock_quantity > 0 ? "stock available" : "stock unavailable"}>
              {product.stock_quantity > 0 ? "In stock" : "Currently unavailable"}
            </small>
            {product.warranty_description && <small className="warranty">Warranty: {product.warranty_description}</small>}
          </div>
        </article>
      ))}
    </div>
  );
}
