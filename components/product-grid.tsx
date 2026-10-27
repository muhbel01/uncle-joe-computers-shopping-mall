"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { storeConfig } from "@/lib/store-config";

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
  image_url?: string | null;
  image_alt?: string | null;
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: storeConfig.currency,
  maximumFractionDigits: 0,
});

const conditionLabels: Record<StoreProduct["condition"], string> = {
  new: "New",
  used: "Used",
  refurbished: "Refurbished",
};

export function ProductGrid({ products }: { products: StoreProduct[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [condition, setCondition] = useState("all");
  const [sort, setSort] = useState("newest");

  const categories = useMemo(() => {
    const unique = new Map<string, string>();
    products.forEach((product) => {
      if (product.category?.slug && product.category.name) {
        unique.set(product.category.slug, product.category.name);
      }
    });
    return [...unique.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const filtered = products.filter((product) => {
      const matchesSearch = !term || [product.name, product.brand, product.category?.name]
        .some((value) => value?.toLocaleLowerCase().includes(term));
      const matchesCategory = category === "all" || product.category?.slug === category;
      const matchesCondition = condition === "all" || product.condition === condition;
      return matchesSearch && matchesCategory && matchesCondition;
    });

    if (sort === "price-asc") filtered.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") filtered.sort((a, b) => b.price - a.price);
    if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [products, search, category, condition, sort]);

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
    <div>
      <div className="catalogue-filters" aria-label="Filter products">
        <label className="catalogue-search">Search products
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, brand or category" />
        </label>
        <label>Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
        </label>
        <label>Condition
          <select value={condition} onChange={(event) => setCondition(event.target.value)}>
            <option value="all">All conditions</option>
            <option value="new">New</option>
            <option value="used">Used</option>
            <option value="refurbished">Refurbished</option>
          </select>
        </label>
        <label>Sort by
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="newest">Recently added</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name">Product name</option>
          </select>
        </label>
      </div>
      <p className="catalogue-result-count" aria-live="polite">
        Showing {filteredProducts.length} of {products.length} products
      </p>
      {filteredProducts.length === 0 ? (
        <div className="catalogue-placeholder" role="status">
          <strong>No matching products</strong>
          <small>Try another search or clear the filters to see more products.</small>
          <button className="button secondary" type="button" onClick={() => { setSearch(""); setCategory("all"); setCondition("all"); setSort("newest"); }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <article className="product-card" key={product.id}>
              {product.image_url ? <div className="product-art product-art-photo"><Image src={product.image_url} alt={product.image_alt || product.name} width={480} height={320} unoptimized /></div> : <div className="product-art" aria-hidden="true">{storeConfig.shortName.slice(0, 2).toUpperCase()}</div>}
              <div className="product-card-body">
                {product.category?.name && <small className="product-category">{product.category.name}</small>}
                <h2><Link href={`/products/${product.slug}`}>{product.name}</Link></h2>
                <p className="product-meta">{product.brand || "Quality tech"} · {conditionLabels[product.condition]}</p>
                <strong className="product-price">{naira.format(product.price)}</strong>
                <small className={product.stock_quantity > 0 ? "stock available" : "stock unavailable"}>
                  {product.stock_quantity > 0 ? "In stock" : "Currently unavailable"}
                </small>
                {product.warranty_description && <small className="warranty">Warranty: {product.warranty_description}</small>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
