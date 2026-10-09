import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabasePublicConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const roleLabels: Record<string, string> = { super_admin: "Super Admin", manager: "Manager", inventory_staff: "Inventory Staff", order_staff: "Order Staff" };

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  if (!hasSupabasePublicConfig()) redirect("/admin/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: staff, error } = await supabase.from("staff_members").select("role,is_active").eq("user_id", user.id).maybeSingle();
  if (error || !staff || !staff.is_active) redirect("/admin/login?reason=not-authorized");
  const params = await searchParams;
  const canUseInventory = ["super_admin", "manager", "inventory_staff"].includes(staff.role);

  return <main className="page-shell"><section className="container page-heading admin-dashboard">
    <Link href="/" className="back-link">← View shop</Link><span className="eyebrow">UNCLE JOE COMPUTERS · STAFF WORKSPACE</span>
    <h1>Admin dashboard</h1><p>Signed in as {user.email ?? "authorised staff"} · {roleLabels[staff.role] ?? staff.role}</p>
    {params.reason === "insufficient-permissions" && <p className="admin-flash error" role="alert">Your staff role does not have permission to open that workspace.</p>}
    <div className="admin-notice"><strong>Staff access verified</strong><p>Catalogue permissions are role-restricted. Stock changes are applied atomically and recorded in inventory movements and the audit log.</p></div>
    <div className="admin-work-grid">
      <article><span className="eyebrow">CATALOGUE</span><h2>Products & inventory</h2><p>Create product records, track stock levels and record restocks, returns, damage and corrections.</p>{canUseInventory ? <Link href="/admin/products" className="status-note">Open workspace →</Link> : <span className="status-note">Inventory access restricted</span>}</article>
      <article><span className="eyebrow">ORDERS</span><h2>Orders & fulfilment</h2><p>Order handling remains disabled until checkout, payment verification and fulfilment workflows are tested.</p><span className="status-note">Not enabled</span></article>
      <article><span className="eyebrow">SECURITY</span><h2>Role-based access</h2><p>Server-side checks use the authenticated user and active staff role in the database.</p><span className="status-note">Role verified</span></article>
    </div>
    <form action="/admin/logout" method="post"><button className="admin-logout" type="submit">Sign out</button></form>
  </section></main>;
}
