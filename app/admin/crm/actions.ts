"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/admin/require-staff";

const customerSchema = z.object({
  full_name: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  company: z.string().trim().max(160).optional(),
  customer_type: z.enum(["retail", "business", "wholesale", "corporate"]),
  lifecycle_stage: z.enum(["lead", "prospect", "customer", "repeat_customer", "inactive"]),
  source: z.string().trim().max(100).optional(),
  preferred_contact: z.enum(["whatsapp", "phone", "email", "in_person"]),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
  next_follow_up_at: z.string().optional(),
  internal_notes: z.string().trim().max(2000).optional(),
});

export async function createCustomer(formData: FormData) {
  const { supabase, user } = await requireStaff(["super_admin", "manager", "order_staff"]);
  const parsed = customerSchema.safeParse({
    full_name: formData.get("full_name"), phone: formData.get("phone") || "",
    email: formData.get("email") || "", company: formData.get("company") || "",
    customer_type: formData.get("customer_type"), lifecycle_stage: formData.get("lifecycle_stage"),
    source: formData.get("source") || "", preferred_contact: formData.get("preferred_contact"),
    city: formData.get("city") || "", state: formData.get("state") || "",
    assigned_to: formData.get("assigned_to") || "", next_follow_up_at: formData.get("next_follow_up_at") || "",
    internal_notes: formData.get("internal_notes") || "",
  });
  if (!parsed.success) redirect("/admin/crm?error=invalid-customer");
  const v = parsed.data;
  let followUp: string | null = null;
  if (v.next_follow_up_at) {
    const date = new Date(v.next_follow_up_at);
    if (Number.isNaN(date.getTime())) redirect("/admin/crm?error=invalid-customer");
    followUp = date.toISOString();
  }
  const { error } = await supabase.from("crm_customers").insert({
    full_name: v.full_name, phone: v.phone || null, email: v.email || null,
    company: v.company || null, customer_type: v.customer_type, lifecycle_stage: v.lifecycle_stage,
    source: v.source || null, preferred_contact: v.preferred_contact, city: v.city || null,
    state: v.state || null, assigned_to: v.assigned_to || null, next_follow_up_at: followUp,
    internal_notes: v.internal_notes || null, created_by: user.id,
  });
  if (error) redirect("/admin/crm?error=save-failed");
  revalidatePath("/admin/crm");
  redirect("/admin/crm?notice=customer-created");
}

export async function updateCustomer(formData: FormData) {
  const { supabase } = await requireStaff(["super_admin", "manager", "order_staff"]);
  const id = z.string().uuid().safeParse(formData.get("id"));
  const stage = z.enum(["lead", "prospect", "customer", "repeat_customer", "inactive"]).safeParse(formData.get("lifecycle_stage"));
  const assigned = z.string().uuid().optional().or(z.literal("")).safeParse(formData.get("assigned_to") || "");
  const follow = z.string().optional().safeParse(formData.get("next_follow_up_at") || "");
  if (!id.success || !stage.success || !assigned.success || !follow.success) redirect("/admin/crm?error=invalid-customer");
  let nextFollowUp: string | null = null;
  if (follow.data) {
    const date = new Date(follow.data);
    if (Number.isNaN(date.getTime())) redirect("/admin/crm?error=invalid-customer");
    nextFollowUp = date.toISOString();
  }
  const { error } = await supabase.from("crm_customers").update({
    lifecycle_stage: stage.data, assigned_to: assigned.data || null,
    next_follow_up_at: nextFollowUp,
  }).eq("id", id.data);
  if (error) redirect("/admin/crm?error=save-failed");
  revalidatePath("/admin/crm");
  redirect("/admin/crm?notice=customer-updated");
}

export async function logCustomerActivity(formData: FormData) {
  const { supabase, user } = await requireStaff(["super_admin", "manager", "order_staff"]);
  const customerId = z.string().uuid().safeParse(formData.get("customer_id"));
  const type = z.enum(["call", "whatsapp", "email", "visit", "purchase", "complaint", "follow_up", "note"]).safeParse(formData.get("activity_type"));
  const summary = z.string().trim().min(2).max(2000).safeParse(formData.get("summary"));
  const outcome = z.string().trim().max(1000).optional().safeParse(formData.get("outcome") || "");
  const follow = z.string().optional().safeParse(formData.get("follow_up_at") || "");
  if (!customerId.success || !type.success || !summary.success || !outcome.success || !follow.success) redirect("/admin/crm?error=invalid-activity");
  let nextFollowUp: string | null = null;
  if (follow.data) {
    const date = new Date(follow.data);
    if (Number.isNaN(date.getTime())) redirect("/admin/crm?error=invalid-activity");
    nextFollowUp = date.toISOString();
  }
  const { error } = await supabase.from("crm_activities").insert({
    customer_id: customerId.data, activity_type: type.data, summary: summary.data,
    outcome: outcome.data || null, follow_up_at: nextFollowUp, performed_by: user.id,
  });
  if (error) redirect("/admin/crm?error=activity-failed");
  const updates: Record<string, string | null> = { last_contacted_at: new Date().toISOString() };
  if (nextFollowUp) updates.next_follow_up_at = nextFollowUp;
  await supabase.from("crm_customers").update(updates).eq("id", customerId.data);
  revalidatePath("/admin/crm");
  redirect("/admin/crm?notice=activity-saved");
}
