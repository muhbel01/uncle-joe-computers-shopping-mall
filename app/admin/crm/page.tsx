import Link from "next/link";
import { requireStaff } from "@/lib/admin/require-staff";
import { createCustomer, updateCustomer, logCustomerActivity } from "./actions";

export const dynamic = "force-dynamic";
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—";
const stages = ["lead", "prospect", "customer", "repeat_customer", "inactive"] as const;
const types = ["retail", "business", "wholesale", "corporate"] as const;

export default async function AdminCrmPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string; q?: string; stage?: string }> }) {
  const { supabase, user } = await requireStaff(["super_admin", "manager", "order_staff"]);
  const params = await searchParams;
  const [{ data: customers }, { data: staff }] = await Promise.all([
    supabase.from("crm_customers").select("id,full_name,phone,email,company,customer_type,lifecycle_stage,source,preferred_contact,city,state,assigned_to,next_follow_up_at,last_contacted_at,internal_notes,created_at").order("next_follow_up_at", { ascending: true, nullsFirst: false }).limit(200),
    supabase.from("staff_members").select("user_id,role").eq("is_active", true).in("role", ["super_admin", "manager", "order_staff"]),
  ]);
  const visibleCustomers = (customers ?? []).filter(c => {
    const term = (params.q ?? "").trim().toLowerCase();
    const matchTerm = !term || [c.full_name,c.phone,c.email,c.company,c.city,c.state].some(v => String(v ?? "").toLowerCase().includes(term));
    return matchTerm && (!params.stage || params.stage === "all" || c.lifecycle_stage === params.stage);
  });
  const customerIds = visibleCustomers.map(c => c.id);
  const { data: activities } = customerIds.length ? await supabase.from("crm_activities").select("id,customer_id,activity_type,summary,outcome,follow_up_at,performed_by,created_at").in("customer_id", customerIds).order("created_at", { ascending: false }).limit(500) : { data: [] as {id:string;customer_id:string;activity_type:string;summary:string;outcome:string|null;follow_up_at:string|null;performed_by:string|null;created_at:string}[] };
  const activityByCustomer = new Map<string, NonNullable<typeof activities>>();
  for (const activity of activities ?? []) {
    const list = activityByCustomer.get(activity.customer_id) ?? [];
    if (list.length < 3) list.push(activity);
    activityByCustomer.set(activity.customer_id, list);
  }
  const staffName = new Map((staff ?? []).map(s => [s.user_id, s.role.replaceAll("_", " ")]));
  const notice = params.notice === "customer-created" ? "Customer saved." : params.notice === "customer-updated" ? "Customer details updated." : params.notice === "activity-saved" ? "Interaction logged and timeline updated." : "";
  const error = params.error === "invalid-customer" ? "Check required customer fields and try again." : params.error === "save-failed" ? "Customer could not be saved. Check permissions and retry." : params.error === "invalid-activity" ? "Check the interaction type, note and follow-up date." : params.error === "activity-failed" ? "Interaction could not be saved. Try again." : "";

  return <main className="page-shell"><section className="container page-heading admin-products">
    <Link href="/admin" className="back-link">← Admin dashboard</Link>
    <span className="eyebrow">CUSTOMER RELATIONSHIPS</span><h1>Customer CRM</h1>
    <p>Signed in as {user.email ?? "authorised staff"}. Keep contact details, customer stage, staff ownership, conversations and follow-up dates in one place.</p>
    {notice && <p className="admin-flash success" role="status">{notice}</p>}
    {error && <p className="admin-flash error" role="alert">{error}</p>}
    <div className="admin-stock-summary">
      <article><small>All contacts</small><strong>{customers?.length ?? 0}</strong></article>
      <article><small>Leads</small><strong>{(customers ?? []).filter(c => c.lifecycle_stage === "lead" || c.lifecycle_stage === "prospect").length}</strong></article>
      <article><small>Customers</small><strong>{(customers ?? []).filter(c => c.lifecycle_stage === "customer" || c.lifecycle_stage === "repeat_customer").length}</strong></article>
      <article><small>Follow-ups due</small><strong>{(customers ?? []).filter(c => c.next_follow_up_at && new Date(c.next_follow_up_at).getTime() <= Date.now()).length}</strong></article>
    </div>
    <section className="admin-panel">
      <h2>Add customer or sales lead</h2><p className="panel-help">Record only useful business contact details. Do not store payment card data, passwords or sensitive personal information.</p>
      <form action={createCustomer} className="admin-data-form">
        <label>Full name *<input name="full_name" required minLength={2} maxLength={160} /></label>
        <label>Phone / WhatsApp<input name="phone" maxLength={40} placeholder="+234..." /></label>
        <label>Email<input name="email" type="email" maxLength={254} /></label>
        <label>Company / organisation<input name="company" maxLength={160} /></label>
        <label>Customer type<select name="customer_type" defaultValue="retail">{types.map(t => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}</select></label>
        <label>Stage<select name="lifecycle_stage" defaultValue="lead">{stages.map(t => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}</select></label>
        <label>How they found us<input name="source" maxLength={100} placeholder="Walk-in, WhatsApp, referral, website" /></label>
        <label>Preferred contact<select name="preferred_contact" defaultValue="whatsapp"><option value="whatsapp">WhatsApp</option><option value="phone">Phone call</option><option value="email">Email</option><option value="in_person">In person</option></select></label>
        <label>City<input name="city" maxLength={100} defaultValue="Osogbo" /></label>
        <label>State<input name="state" maxLength={100} defaultValue="Osun" /></label>
        <label>Assign to<select name="assigned_to" defaultValue=""><option value="">Unassigned</option>{(staff ?? []).map(s => <option key={s.user_id} value={s.user_id}>{staffName.get(s.user_id)} · {s.user_id.slice(0, 8)}</option>)}</select></label>
        <label>Next follow-up<input name="next_follow_up_at" type="datetime-local" /></label>
        <label className="span-two">Internal notes<textarea name="internal_notes" rows={2} maxLength={2000} placeholder="Product interest, quotation status, service preferences…" /></label>
        <button className="admin-submit" type="submit">Save customer</button>
      </form>
    </section>
    <section className="admin-panel">
      <div className="admin-panel-heading"><div><h2>Contacts and follow-ups</h2><p className="panel-help">Search, update customer stage and log the latest interaction. Up to 200 recent contacts are loaded.</p></div><span className="admin-count">{visibleCustomers.length} shown</span></div>
      <form method="get" className="crm-filter-form">
        <label>Search<input name="q" defaultValue={params.q ?? ""} placeholder="Name, phone, email, company…" /></label>
        <label>Stage<select name="stage" defaultValue={params.stage ?? "all"}><option value="all">All stages</option>{stages.map(s => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></label>
        <button className="admin-submit" type="submit">Filter contacts</button><Link href="/admin/crm" className="crm-clear">Clear</Link>
      </form>
      {visibleCustomers.length === 0 ? <p className="empty-state">No matching contacts yet. Add your first lead above or change the search.</p> :
        <div className="crm-customer-list">{visibleCustomers.map(c => <article className="crm-customer-card" key={c.id}>
          <div className="crm-customer-head"><div><span className="status-pill">{c.lifecycle_stage.replaceAll("_", " ")}</span><h3>{c.full_name}</h3><p>{[c.company,c.phone,c.email,[c.city,c.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "No contact details yet"}</p></div><small>Added {dateTime(c.created_at)}</small></div>
          <div className="crm-customer-meta"><span>Type: {c.customer_type}</span><span>Source: {c.source || "Not recorded"}</span><span>Preferred: {c.preferred_contact}</span><span>Owner: {c.assigned_to ? staffName.get(c.assigned_to) ?? "Assigned staff" : "Unassigned"}</span><span>Last contact: {dateTime(c.last_contacted_at)}</span><strong>Follow-up: {dateTime(c.next_follow_up_at)}</strong></div>
          {c.internal_notes && <p className="crm-notes"><strong>Notes:</strong> {c.internal_notes}</p>}
          <details className="crm-details"><summary>Update stage / owner / follow-up</summary><form action={updateCustomer} className="crm-inline-form">
            <input type="hidden" name="id" value={c.id} />
            <label>Stage<select name="lifecycle_stage" defaultValue={c.lifecycle_stage}>{stages.map(s => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></label>
            <label>Assign to<select name="assigned_to" defaultValue={c.assigned_to ?? ""}><option value="">Unassigned</option>{(staff ?? []).map(s => <option key={s.user_id} value={s.user_id}>{staffName.get(s.user_id)} · {s.user_id.slice(0, 8)}</option>)}</select></label>
            <label>Next follow-up<input name="next_follow_up_at" type="datetime-local" defaultValue={c.next_follow_up_at ? new Date(new Date(c.next_follow_up_at).getTime() - new Date(c.next_follow_up_at).getTimezoneOffset() * 60000).toISOString().slice(0,16) : ""} /></label>
            <button className="admin-submit" type="submit">Update contact</button>
          </form></details>
          <details className="crm-details"><summary>Log call, WhatsApp, email or note</summary><form action={logCustomerActivity} className="crm-inline-form">
            <input type="hidden" name="customer_id" value={c.id} />
            <label>Interaction<select name="activity_type" defaultValue="whatsapp">{["whatsapp","call","email","visit","purchase","complaint","follow_up","note"].map(t => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}</select></label>
            <label>Summary *<textarea name="summary" required minLength={2} maxLength={2000} rows={2} placeholder="What did the customer ask for? What did we promise?" /></label>
            <label>Outcome<input name="outcome" maxLength={1000} placeholder="Quoted, resolved, awaiting reply…" /></label>
            <label>Next follow-up<input name="follow_up_at" type="datetime-local" /></label>
            <button className="admin-submit" type="submit">Save interaction</button>
          </form></details>
          {(activityByCustomer.get(c.id) ?? []).length > 0 && <div className="crm-timeline"><strong>Recent activity</strong>{(activityByCustomer.get(c.id) ?? []).map(a => <div key={a.id}><small>{a.activity_type.replaceAll("_", " ")} · {dateTime(a.created_at)}</small><p>{a.summary}</p>{a.outcome && <small>Outcome: {a.outcome}</small>}</div>)}</div>}
        </article>)}</div>}
    </section>
    <p className="admin-security-note">CRM access is limited to Super Admin, Manager and Order Staff. Inventory staff do not have access to customer records. Staff IDs are shortened in the assignment list for identification; do not share private contact exports.</p>
  </section></main>;
}
