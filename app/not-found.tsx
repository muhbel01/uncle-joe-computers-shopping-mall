import Link from "next/link";

export default function NotFound() {
  return <main className="container" style={{ paddingBlock: 96, textAlign: "center" }}>
    <p className="eyebrow">404 · PAGE NOT FOUND</p>
    <h1>We couldn’t find that page.</h1>
    <p>Try returning to the store homepage.</p>
    <Link className="button primary" href="/">Back to home</Link>
  </main>;
}
