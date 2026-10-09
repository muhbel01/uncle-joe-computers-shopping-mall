import Link from "next/link";

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
];

export default function HomePage() {
  return (
    <main>
      <div className="topbar">
        <div className="container topbar-inner">
          <span>Serving Osogbo and customers across Nigeria</span>
          <span>Need help? Contact our team on WhatsApp</span>
        </div>
      </div>
      <header className="header">
        <div className="container header-inner">
          <Link className="brand" href="/" aria-label="Uncle Joe Computers home">
            <span className="brand-mark">UJ</span>
            <span><strong>UNCLE JOE</strong><small>COMPUTERS SHOPPING MALL</small></span>
          </Link>
          <form className="search" action="/search">
            <label className="sr-only" htmlFor="q">Search products</label>
            <input id="q" name="q" placeholder="Search laptops, phones, accessories..." />
            <button type="submit">Search</button>
          </form>
          <Link className="cart" href="/cart">Cart <span>0</span></Link>
        </div>
        <nav className="nav">
          <div className="container nav-inner">
            <Link href="/products">Shop all products</Link><a href="#categories">Categories</a><a href="#featured">Featured</a><a href="#why-us">Why shop with us</a><a href="#contact">Contact</a>
          </div>
        </nav>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">YOUR TRUSTED TECH STORE</span>
            <h1>Technology for work, life and everything in between.</h1>
            <p>Shop computers, phones, accessories, networking equipment and power solutions — with friendly support from Osogbo to across Nigeria.</p>
            <div className="hero-actions"><a className="button primary" href="#categories">Explore categories</a><a className="button secondary" href="#contact">Talk to our team</a></div>
            <div className="trust-row"><span>✓ New and used options</span><span>✓ Nationwide delivery</span><span>✓ Human support</span></div>
          </div>
          <div className="hero-art" aria-label="Technology product illustration" role="img">
            <div className="glow" />
            <div className="laptop"><div className="laptop-screen"><span>UJ</span><small>SMARTER TECH. BETTER VALUE.</small></div><div className="laptop-base" /></div>
            <div className="phone"><div className="phone-screen"><span>●</span><b>TECH</b><small>made simple</small></div></div>
            <div className="floating-card">⚡ Reliable power</div>
            <div className="floating-chip">Genuine advice. Great choice.</div>
          </div>
        </div>
      </section>

      <section className="benefits">
        <div className="container benefit-grid">
          <div><span>🚚</span><p><strong>Nationwide delivery</strong><small>From Osogbo to your doorstep</small></p></div>
          <div><span>🛡️</span><p><strong>Clear product details</strong><small>Condition and warranty explained</small></p></div>
          <div><span>💬</span><p><strong>Helpful support</strong><small>Talk to a real person</small></p></div>
        </div>
      </section>

      <section id="categories" className="section container">
        <div className="section-heading"><div><span className="eyebrow">FIND YOUR NEXT ESSENTIAL</span><h2>Shop by category</h2></div><p>Everything you need to stay productive, connected and powered.</p></div>
        <div className="category-grid">
          {categories.map((category) => <Link className="category-card" href={"/category/" + category.slug} key={category.title}><span className="category-icon">{category.icon}</span><strong>{category.title}</strong><small>{category.text}</small><span className="arrow">↗</span></Link>)}
        </div>
      </section>

      <section id="featured" className="featured">
        <div className="container featured-inner"><div><span className="eyebrow">COMING INTO FOCUS</span><h2>Good tech starts with the right advice.</h2><p>Our catalogue is being prepared. Soon you&apos;ll be able to browse available stock, compare product conditions and place an order online.</p></div><div className="catalogue-placeholder"><span>✦</span><strong>Our product catalogue</strong><small>Products will appear here as inventory is added.</small></div></div>
      </section>

      <section id="why-us" className="section container">
        <div className="section-heading"><div><span className="eyebrow">THE UNCLE JOE DIFFERENCE</span><h2>Shop with confidence</h2></div></div>
        <div className="why-grid"><article><span>01</span><h3>Know what you&apos;re buying</h3><p>Product condition, specifications and available warranty will be clearly stated.</p></article><article><span>02</span><h3>Options that fit your budget</h3><p>Explore suitable new and used devices as stock becomes available.</p></article><article><span>03</span><h3>Support beyond checkout</h3><p>Get help with product selection, order updates and after-sales questions.</p></article></div>
      </section>

      <footer id="contact" className="footer"><div className="container footer-inner"><div><Link className="brand footer-brand" href="/"><span className="brand-mark">UJ</span><span><strong>UNCLE JOE</strong><small>COMPUTERS SHOPPING MALL</small></span></Link><p>Your technology shopping partner in Osogbo, Osun State, Nigeria.</p></div><div><strong>Customer care</strong><p>Contact details and WhatsApp support will be added before launch.</p><small>Online checkout is not active yet.</small></div></div><div className="container copyright">© {new Date().getFullYear()} Uncle Joe Computers Shopping Mall. All rights reserved.</div></footer>
    </main>
  );
}
