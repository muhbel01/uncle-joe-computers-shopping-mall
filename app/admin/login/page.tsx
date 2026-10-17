import Link from "next/link";
import { AdminLoginForm } from "@/components/admin-login-form";
import { storeConfig } from "@/lib/store-config";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const params = await searchParams;
  return <main className="page-shell"><section className="container page-heading admin-login-wrap">
    <Link href="/" className="back-link">← Back to shop</Link><span className="eyebrow">STAFF ACCESS</span>
    <h1>Sign in to your workspace</h1><p>For authorised {storeConfig.name} staff only.</p>
    <AdminLoginForm reason={params.reason} />
    <p className="admin-security-note">Staff accounts must be created by an authorised administrator. Public self-registration is disabled.</p>
  </section></main>;
}
