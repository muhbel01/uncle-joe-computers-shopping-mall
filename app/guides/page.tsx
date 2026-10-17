import type { Metadata } from "next";
import Link from "next/link";
import { storeConfig } from "@/lib/store-config";

export const metadata: Metadata = {
  title: "Tech Guides",
  description: `Practical buying and setup guides from ${storeConfig.name}, covering computers, networking, device care and backup power.`,
};

const guides = [
  {
    icon: "💻",
    tag: "Buying guide",
    title: "Choose a laptop for your real workload",
    intro: "Start with what you need the computer to do, not just its appearance or advertised processor.",
    tips: [
      "School, browsing and office work: prioritise an SSD, comfortable keyboard and enough memory for your apps.",
      "Design, coding and heavier work: check software requirements, RAM upgrade options, processor generation and graphics needs.",
      "Before paying, compare the exact model number, battery condition, screen, keyboard, ports and included charger.",
    ],
  },
  {
    icon: "🔎",
    tag: "New, used or refurbished",
    title: "Inspect a used computer before buying",
    intro: "A low price is only good value when the device is working properly and its condition is clear.",
    tips: [
      "Ask for the exact model and serial number, and confirm the device is not locked to another owner or organisation.",
      "Test charging, battery health, screen, keyboard, touchpad, webcam, Wi-Fi, audio and every important port.",
      "Check storage health where possible, inspect for liquid or physical damage, and get the return terms and warranty in writing.",
    ],
  },
  {
    icon: "🧰",
    tag: "Device care",
    title: "Make your laptop last longer",
    intro: "Simple habits can reduce avoidable wear and help protect your files.",
    tips: [
      "Keep vents clear and use the laptop on a hard, stable surface rather than soft bedding.",
      "Install trusted software updates, use a reputable security tool, and back up important files regularly.",
      "Avoid pulling cables by the wire, keep liquids away, and arrange qualified service if the device overheats or the battery swells.",
    ],
  },
  {
    icon: "📶",
    tag: "Home networking",
    title: "Get better Wi-Fi at home or work",
    intro: "Router placement and the layout of your space can matter as much as the internet package.",
    tips: [
      "Place the router in an open, central location, away from thick obstructions and enclosed cabinets.",
      "Use a strong unique Wi-Fi password, change default administrator credentials, and install router firmware updates.",
      "If coverage is still weak, compare a mesh system or access point; confirm compatibility and your building layout first.",
    ],
  },
  {
    icon: "🔋",
    tag: "Power planning",
    title: "Choose backup power more confidently",
    intro: "Match the system to the equipment you need to keep running and how long it must stay on.",
    tips: [
      "List each device, its wattage and expected hours of use; add the loads to estimate energy needs.",
      "Check inverter continuous rating, surge capacity, battery voltage and usable energy—not only the headline battery size.",
      "For solar, battery and mains wiring, ask a qualified installer to assess protection, earthing, ventilation and local requirements.",
    ],
  },
  {
    icon: "🛡️",
    tag: "Security planning",
    title: "Plan a CCTV setup before buying",
    intro: "Good coverage starts with the areas you need to monitor and the footage you need to keep.",
    tips: [
      "Map entrances, walkways and blind spots while respecting neighbours’ privacy and applicable rules.",
      "Choose camera resolution, night performance, weather rating and storage retention based on the location.",
      "Confirm recorder compatibility, network access security, storage capacity and installation requirements with a qualified installer.",
    ],
  },
];

export default function GuidesPage() {
  return (
    <main className="guides-page">
      <header className="guides-hero">
        <div className="container">
          <div className="guides-breadcrumb"><Link href="/">Home</Link><span> / </span><span>Tech Guides</span></div>
          <span className="eyebrow">THE TECH KNOW-HOW HUB</span>
          <h1>Make a smarter tech choice.</h1>
          <p>Clear, practical advice to help you choose devices, take care of your equipment and understand the questions to ask before you buy. We’ll keep adding guides as the store grows.</p>
        </div>
      </header>
      <section className="container guides-main">
        <div className="guides-intro">
          <div><span className="eyebrow">PRACTICAL ADVICE, WITHOUT THE JARGON</span><h2>Start with what you want to do.</h2></div>
          <p>Use these checklists to compare your options. Product availability, prices, checkout and membership enrolment are not live yet.</p>
        </div>
        <div className="guides-grid">
          {guides.map((guide) => (
            <article className="guide-card" key={guide.title}>
              <div className="guide-card-top"><span className="guide-card-icon" aria-hidden="true">{guide.icon}</span><div><small>{guide.tag}</small><h3>{guide.title}</h3></div></div>
              <p>{guide.intro}</p>
              <ul>{guide.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
            </article>
          ))}
        </div>
        <aside className="guide-note"><strong>Power and electrical safety:</strong> This page is general buying guidance, not a substitute for a site assessment. Do not open mains-powered equipment or attempt electrical installation yourself. Use a qualified professional for wiring, protection and commissioning.</aside>
        <div className="guides-cta"><div><h2>Still comparing your options?</h2><p>Browse the store categories or return to the homepage for updates as the catalogue develops.</p></div><Link className="button primary" href="/products">Browse products <span aria-hidden="true">→</span></Link></div>
      </section>
      <footer className="footer"><div className="container footer-inner"><div><Link className="brand footer-brand" href="/"><span className="brand-mark">{storeConfig.shortName.slice(0, 2).toUpperCase()}</span><span><strong>{storeConfig.name}</strong><small>{storeConfig.shortName}</small></span></Link><p>Your technology shopping partner in {storeConfig.location}.</p></div><div><strong>Customer care</strong><p>Contact details and WhatsApp support will be added before launch.</p><small>Online checkout is not active yet.</small></div></div><div className="container copyright">© {new Date().getFullYear()} {storeConfig.name}. All rights reserved.</div></footer>
    </main>
  );
}
