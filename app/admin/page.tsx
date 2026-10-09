import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabasePublicConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const roleLabels: Record<string, string> = { super_admin: "Super Admin", manager: "Manager", inventory_staff: "Inventory Staff", order_staff: "Order Staff" };

export default async function AdminDashboardPage() {
  if (!hasSupabasePublicConfig()) redirect("/admin/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: staff, error } = await supabase.from("staff_members").select("role,is_active").eq("user_id", user.id).maybeSingle();
  if (error || !staff || !staff.is_active) redirect("/admin/login?reason=not-authorized");

  return <main className="page-shell"><section className="container page-heading admin-dashboard">
    <Link href="/" className="back-link">← View shop</Link><span className="eyebrow">UNCLE JOE COMPUTERS · STAFF WORKSPACE</span>
    <h1>Admin dashboard</h1><p>Signed in as {user.email ?? "authorised staff"} · {roleLabels[staff.role] ?? staff.role}</p>
    <div className="admin-notice"><strong>Staff access verified</strong><p>Your account is authenticated and has an active staff role. Administrative changes will be enabled after permissions and audit logging are tested.</p></div>
    <div className="admin-work-grid">
      <article><span className="eyebrow">CATALOGUE</span><h2>Products & inventory</h2><p>Product creation, stock adjustments and low-stock alerts are the next implementation step.</p><span className="status-note">Coming next</span></article>
      <article><span className="eyebrow">ORDERS</span><h2>Orders & fulfilment</h2><p>Order handling will be enabled after checkout and payment verification are implemented.</p><span className="status-note">Not enabled</span></article>
      <article><span className="eyebrow">SECURITY</span><h2>Role-based access</h2><p>Access is checked on the server against the staff_members table, not a browser-provided role.</p><span className="status-note">Role verified</span></article>
    </div>
    <form action="/admin/logout" method="post"><button className="admin-logout" type="submit">Sign out</button></form>
  </section></main>;
}
