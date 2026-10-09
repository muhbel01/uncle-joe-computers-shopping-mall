"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/admin/require-staff";

const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  category_id: z.string().uuid().optional().or(z.literal("")),
  sku: z.string().trim().max(80).optional(),
  brand: z.string().trim().max(100).optional(),
  condition: z.enum(["new", "used", "refurbished"]),
  price: z.coerce.number().finite().min(0).max(999999999),
  compare_at_price: z.preprocess((value) => value === "" || value === null || value === undefined ? undefined : Number(value), z.number().finite().min(0).max(999999999).optional()),
  low_stock_threshold: z.coerce.number().int().min(0).max(100000),
  warranty_description: z.string().trim().max(500).optional(),
  short_description: z.string().trim().max(240).optional(),
  description: z.string().trim().max(5000).optional(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
});

const stockSchema = z.object({
  product_id: z.string().uuid(),
  quantity_delta: z.coerce.number().int().min(-100000).max(100000).refine(v => v !== 0),
  movement_type: z.enum(["opening_balance", "restock", "return", "damage", "correction"]),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150);
}

export async function createProduct(formData: FormData) {
  const { supabase } = await requireStaff(["super_admin", "manager"]);
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    category_id: formData.get("category_id") || "",
    sku: formData.get("sku") || "",
    brand: formData.get("brand") || "",
    condition: formData.get("condition"),
    price: formData.get("price"),
    compare_at_price: formData.get("compare_at_price") || "",
    low_stock_threshold: formData.get("low_stock_threshold") || 3,
    warranty_description: formData.get("warranty_description") || "",
    short_description: formData.get("short_description") || "",
    description: formData.get("description") || "",
    is_active: formData.get("is_active") === "on",
    is_featured: formData.get("is_featured") === "on",
  });
  if (!parsed.success) redirect("/admin/products?error=invalid-product");
  const values = parsed.data;
  const slug = slugify(values.name);
  if (!slug) redirect("/admin/products?error=invalid-product");

  const { error } = await supabase.from("products").insert({
    name: values.name,
    slug,
    category_id: values.category_id || null,
    sku: values.sku || null,
    brand: values.brand || null,
    condition: values.condition,
    price: values.price,
    compare_at_price: values.compare_at_price ?? null,
    low_stock_threshold: values.low_stock_threshold,
    warranty_description: values.warranty_description || null,
    short_description: values.short_description || null,
    description: values.description || null,
    is_active: values.is_active,
    is_featured: values.is_featured,
  });
  if (error) redirect("/admin/products?error=save-failed");
  revalidatePath("/products");
  revalidatePath("/");
  revalidatePath("/admin/products");
  redirect("/admin/products?notice=product-created");
}

export async function adjustStock(formData: FormData) {
  const { supabase } = await requireStaff(["super_admin", "manager", "inventory_staff"]);
  const parsed = stockSchema.safeParse({
    product_id: formData.get("product_id"),
    quantity_delta: formData.get("quantity_delta"),
    movement_type: formData.get("movement_type"),
    reference: formData.get("reference") || "",
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) redirect("/admin/products?error=invalid-stock-change");

  const { error } = await supabase.rpc("adjust_inventory", {
    p_product_id: parsed.data.product_id,
    p_quantity_delta: parsed.data.quantity_delta,
    p_movement_type: parsed.data.movement_type,
    p_reference: parsed.data.reference || null,
    p_notes: parsed.data.notes || null,
  });
  if (error) redirect("/admin/products?error=stock-change-failed");
  revalidatePath("/products");
  revalidatePath("/");
  revalidatePath("/admin/products");
  redirect("/admin/products?notice=stock-updated");
}
