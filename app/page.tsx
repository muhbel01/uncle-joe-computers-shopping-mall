import Image from "next/image";
import Link from "next/link";
import type { StoreProduct } from "@/components/product-grid";
import { storeConfig } from "@/lib/store-config";
import { getPublicSupabaseClient } from "@/lib/supabase/public";

const categories = [
  { icon: "💻", title: "Computers & Laptops", slug: "computers-laptops", text: "Work, school and business" },
  { icon: "📱", title: "Phones & Tablets", slug: "phones-tablets", text: "Stay connected" },
  { icon: "🖨️", title: "Printers & Office", slug: "printers-office", text: "Tools for productivity" },
  { icon: "⌨️", title: "Accessories", slug: "accessories", text: "Keyboards, mice and more" },
  { icon: "🌐", title: "Networking", slug: "networking", text: "Connect your devices" },
  { icon: "📹", title: "CCTV & Security", slug: "cctv-security", text: "Protect your space" },
  { icon: "🎮", title: "Gaming & Entertainment", slug: "gaming-entertainment", text: "Play and unwind" },
  { icon: "💾", title: "Storage & Memory", slug: "storage-memory", text: "Keep your data close" },
  { icon: "🔋", title: "Power & Solar", slug: "power-solar", text: "Chargers, UPS and more" },
  { icon: "🏠", title: "Smart Home", slug: "smart-home", text: "Connected living and automation" },
];

export const revalidate = 60;

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: storeConfig.currency,
  maximumFractionDigits: 0,
});

export default async function HomePage() {
  type StoreCategoryCard = { icon: string; title: string; slug: string; text: string };
  let visibleCategories: StoreCategoryCard[] = categories;
  let featuredProducts: StoreProduct[] = [];
  let categoryCatalogueUnavailable = false;
  let featuredCatalogueUnavailable = false;
  const supabase = getPublicSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("name,slug,description")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(10);

      if (error) {
        categoryCatalogueUnavailable = true;
        visibleCategories = [];
      } else {
        // An empty active catalogue is different from a failed query: do not link to demo categories.
        visibleCategories = (data ?? []).map((category) => {
          const fallback = categories.find((item) => item.slug === category.slug);
          return {
            icon: fallback?.icon ?? "🛍️",
            title: category.name,
            slug: category.slug,
            text: category.description?.trim() || fallback?.text || "Browse available products",
          };
        });
      }

      const { data: featuredData, error: featuredError } = await supabase
        .from("products")
        .select("id,name,slug,brand,condition,price,stock_quantity,warranty_description,category:categories(name,slug),images:product_images(storage_path,alt_text,sort_order)")
        .eq("is_active", true)
        .eq("is_featured", true)
        .gt("stock_quantity", 0)
        .order("updated_at", { ascending: false })
        .limit(4);

      featuredCatalogueUnavailable = Boolean(featuredError);
      featuredProducts = ((featuredData ?? []) as unknown as Array<StoreProduct & { images?: { storage_path: string; alt_text: string | null; sort_order: number }[] }>).map((product) => {
        const first = [...(product.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
        return {
          ...product,
          image_url: first ? supabase.storage.from("product-images").getPublicUrl(first.storage_path).data.publicUrl : null,
          image_alt: first?.alt_text ?? product.name,
        };
      });
    } catch {
      // Keep the storefront usable without linking to demo data during a catalogue outage.
      categoryCatalogueUnavailable = true;
      featuredCatalogueUnavailable = true;
      visibleCategories = [];
      featuredProducts = [];
    }
  }

  return (
    <main>
      <div className="topbar">
        <div className="container topbar-inner">
          <span>Based in {storeConfig.location}</span>
          <span>Customer support details will be published before launch</span>
        </div>
      </div>
      <header className="header">
        <div className="container header-inner">
          <Link className="brand" href="/" aria-label={`${storeConfig.name} home`}>
            <span className="brand-mark">{storeConfig.shortName.slice(0, 2).toUpperCase()}</span>
            <span><strong>{storeConfig.name}</strong><small>{storeConfig.shortName}</small></span>
          </Link>
          <form className="search" action="/search">
            <label className="sr-only" htmlFor="q">Search products</label>
            <input id="q" name="q" placeholder="Search laptops, phones, accessories..." />
            <button type="submit">Search</button>
          </form>
          <div className="header-actions"><Link className="header-shop-link" href="/products">Shop products</Link><Link className="cart" href="/cart">Cart <span>→</span></Link></div>
        </div>
        <nav className="nav">
          <div className="container nav-inner">
            <Link href="/products">Shop all products</Link><a href="#categories">Categories</a><a href="#featured">Featured</a><Link href="/guides">Tech guides</Link><a href="#membership">Membership</a><a href="#why-us">Why shop with us</a><a href="#contact">Contact</a>
          </div>
        </nav>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">YOUR TRUSTED TECH STORE</span>
            <h1>Technology for work, life and everything in between.</h1>
            <p>Shop computers, phones, accessories, networking equipment and power solutions — with helpful support from our team.</p>
            <div className="hero-actions"><a className="button primary" href="#categories">Explore categories</a><a className="button secondary" href="#contact">Contact information</a></div>
            <div className="trust-row"><span>✓ New and used options</span><span>✓ Delivery options on enquiry</span><span>✓ Customer support planned</span></div>
          </div>
          <div className="hero-art" aria-label="Technology product illustration" role="img">
            <div className="glow" />
            <div className="laptop"><div className="laptop-screen"><span>{storeConfig.shortName.slice(0, 2).toUpperCase()}</span><small>SMARTER TECH. BETTER VALUE.</small></div><div className="laptop-base" /></div>
            <div className="phone"><div className="phone-screen"><span>●</span><b>TECH</b><small>made simple</small></div></div>
            <div className="floating-card">⚡ Reliable power</div>
            <div className="floating-chip">Genuine advice. Great choice.</div>
          </div>
        </div>
      </section>

      <section className="benefits">
        <div className="container benefit-grid">
          <div><span>🚚</span><p><strong>Delivery enquiries</strong><small>Confirm coverage and cost with our team</small></p></div>
          <div><span>🛡️</span><p><strong>Clear product details</strong><small>Condition and warranty explained</small></p></div>
          <div><span>💬</span><p><strong>Customer support</strong><small>Contact options will be added before launch</small></p></div>
        </div>
      </section>

      <section id="categories" className="section container">
        <div className="section-heading"><div><span className="eyebrow">FIND YOUR NEXT ESSENTIAL</span><h2>Shop by category</h2></div><p>Everything you need to stay productive, connected and powered.</p></div>
        {categoryCatalogueUnavailable ? (
          <div className="catalogue-placeholder" role="status"><strong>Categories temporarily unavailable</strong><small>We couldn’t load the store catalogue right now. Please try again shortly.</small></div>
        ) : visibleCategories.length > 0 ? (
          <div className="category-grid">
            {visibleCategories.map((category) => <Link className="category-card" href={"/category/" + category.slug} key={category.slug}><span className="category-icon">{category.icon}</span><strong>{category.title}</strong><small>{category.text}</small><span className="arrow">↗</span></Link>)}
          </div>
        ) : (
          <div className="catalogue-placeholder">
            <strong>Categories are being prepared</strong>
            <small>Published product categories will appear here when the store catalogue is ready.</small>
            <Link className="button secondary" href="/products">Browse all products</Link>
          </div>
        )}
      </section>

      <section id="featured" className="section container">
        <div className="section-heading"><div><span className="eyebrow">STAFF PICKS</span><h2>Featured products</h2></div><p>Explore selected items currently published and in stock.</p></div>
        {featuredCatalogueUnavailable ? (
          <div className="catalogue-placeholder" role="status"><strong>Featured products temporarily unavailable</strong><small>We couldn’t load featured products right now. Please try again shortly.</small><Link className="button secondary" href="/products">Browse all products</Link></div>
        ) : featuredProducts.length > 0 ? (
          <div className="product-grid">
            {featuredProducts.map((product) => (
              <article className="product-card" key={product.id}>
                {product.image_url ? <div className="product-art product-art-photo"><Image src={product.image_url} alt={product.image_alt || product.name} width={480} height={320} unoptimized /></div> : <div className="product-art" aria-hidden="true">{storeConfig.shortName.slice(0, 2).toUpperCase()}</div>}
                <div className="product-card-body">
                  {product.category?.name && <small className="product-category">{product.category.name}</small>}
                  <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
                  <p className="product-meta">{product.brand || "Quality tech"} · {product.condition === "new" ? "New" : product.condition === "used" ? "Used" : "Refurbished"}</p>
                  <strong className="product-price">{naira.format(product.price)}</strong>
                  <small className="stock available">In stock</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="catalogue-placeholder"><span>✦</span><strong>Featured products will appear here</strong><small>When the store publishes featured items that are in stock, they will be shown in this section.</small><Link className="button secondary" href="/products">Browse all products</Link></div>
        )}
      </section>

      <section id="how-it-works" className="section container">
        <div className="section-heading"><div><span className="eyebrow">SIMPLE FROM START TO FINISH</span><h2>Your next tech upgrade, made easier.</h2></div><p>A clear path from choosing a product to getting the right support.</p></div>
        <div className="steps-grid">
          <article><span>01</span><h3>Explore</h3><p>Browse categories and compare new, used and refurbished options as stock becomes available.</p></article>
          <article><span>02</span><h3>Choose confidently</h3><p>Review key specifications, condition and warranty details before you decide.</p></article>
          <article><span>03</span><h3>Confirm your order</h3><p>Our ordering and payment options will be introduced after checkout and security testing.</p></article>
          <article><span>04</span><h3>Get support</h3><p>Check delivery availability and get help choosing or using your technology.</p></article>
        </div>
      </section>

      <section id="membership" className="membership-band">
        <div className="container membership-content">
          <div className="membership-crown" aria-hidden="true">✦</div>
          <div><span className="eyebrow">MORE VALUE, MORE CONNECTION</span><h2>Meet our customer circle.</h2><p>A planned customer membership for product tips, buying guides, offers and new-arrival updates. Benefits and terms can be configured before enrolment opens.</p></div>
          <a className="button light" href="#contact">Get membership updates <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <section id="why-us" className="section container">
        <div className="section-heading"><div><span className="eyebrow">THE STORE DIFFERENCE</span><h2>Shop with confidence</h2></div></div>
        <div className="why-grid"><article><span>01</span><h3>Know what you&apos;re buying</h3><p>Product condition, specifications and available warranty will be clearly stated.</p></article><article><span>02</span><h3>Options that fit your budget</h3><p>Explore suitable new and used devices as stock becomes available.</p></article><article><span>03</span><h3>Help choosing the right tech</h3><p>Get guidance on product selection and availability. Ordering features will be introduced after launch checks.</p></article></div>
      </section>

      <footer id="contact" className="footer"><div className="container footer-inner"><div><Link className="brand footer-brand" href="/"><span className="brand-mark">{storeConfig.shortName.slice(0, 2).toUpperCase()}</span><span><strong>{storeConfig.name}</strong><small>{storeConfig.shortName}</small></span></Link><p>Your online shopping partner in {storeConfig.location}.</p></div><div><strong>Customer care</strong><p>Contact details and WhatsApp support will be added before launch.</p><small>Online checkout is not active yet.</small></div></div><div className="container copyright">© {new Date().getFullYear()} {storeConfig.name}. All rights reserved.</div></footer>
    </main>
  );
}
