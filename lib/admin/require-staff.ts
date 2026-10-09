import { redirect } from "next/navigation";
import { hasSupabasePublicConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const STAFF_ROLES = ["super_admin", "manager", "inventory_staff", "order_staff"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export async function requireStaff(allowedRoles: readonly StaffRole[] = STAFF_ROLES) {
  if (!hasSupabasePublicConfig()) redirect("/admin/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: staff, error } = await supabase
    .from("staff_members")
    .select("role,is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !staff || !staff.is_active || !STAFF_ROLES.includes(staff.role as StaffRole)) {
    redirect("/admin/login?reason=not-authorized");
  }
  if (!allowedRoles.includes(staff.role as StaffRole)) {
    redirect("/admin?reason=insufficient-permissions");
  }
  return { supabase, user, role: staff.role as StaffRole };
}
