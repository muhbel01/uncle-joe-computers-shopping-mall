import Link from "next/link";
import { AdminLoginForm } from "@/components/admin-login-form";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const params = await searchParams;
  return <main className="page-shell"><section className="container page-heading admin-login-wrap">
    <Link href="/" className="back-link">← Back to shop</Link><span className="eyebrow">STAFF ACCESS</span>
    <h1>Sign in to your workspace</h1><p>For authorised Uncle Joe Computers staff only.</p>
    <AdminLoginForm reason={params.reason} />
    <p className="admin-security-note">Staff accounts must be created by an authorised administrator. Public self-registration is disabled.</p>
  </section></main>;
}
