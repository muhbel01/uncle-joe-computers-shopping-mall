"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/admin/require-staff";

const rowSchema = z.object({
  category_slug: z.string().trim().max(100).optional(),
  name: z.string().trim().min(2).max(160),
  sku: z.string().trim().max(80).optional(),
  brand: z.string().trim().max(100).optional(),
  condition: z.enum(["new", "used", "refurbished"]),
  price_ngn: z.coerce.number().finite().min(0).max(999999999),
  compare_at_price_ngn: z.preprocess(v => v === "" || v === undefined ? undefined : Number(v), z.number().finite().min(0).max(999999999).optional()),
  short_description: z.string().trim().max(240).optional(),
  description: z.string().trim().max(5000).optional(),
  warranty_description: z.string().trim().max(500).optional(),
  return_eligible: z.preprocess(v => v === "true" ? true : v === "false" ? false : undefined, z.boolean().optional()),
  serial_tracking_required: z.preprocess(v => v === "true" ? true : v === "false" ? false : undefined, z.boolean().optional()),
  low_stock_threshold: z.preprocess(v => v === "" || v === undefined ? 3 : Number(v), z.number().int().min(0).max(100000)),
  opening_stock: z.preprocess(v => v === "" || v === undefined ? 0 : Number(v), z.number().int().min(0).max(100000)),
  is_active: z.string().optional(),
  is_featured: z.string().optional(),
});

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ",") { row.push(field.trim()); field = ""; }
    else if (char.charCodeAt(0) === 10 || char.charCodeAt(0) === 13) {
      if (char.charCodeAt(0) === 13 && input[i + 1]?.charCodeAt(0) === 10) i++;
      row.push(field.trim()); field = "";
      if (row.some(value => value.length > 0)) rows.push(row);
      row = [];
    } else field += char;
  }
  if (quoted) throw new Error("Unclosed quoted field");
  if (field.length || row.length) { row.push(field.trim()); if (row.some(value => value.length > 0)) rows.push(row); }
  return rows;
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

export async function importProductsCsv(formData: FormData) {
  const { supabase } = await requireStaff(["super_admin", "manager", "inventory_staff"]);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 900_000) redirect("/admin/products/import?error=file");
  let rows: string[][];
  try { rows = parseCsv(await file.text()); } catch { redirect("/admin/products/import?error=csv"); }
  if (rows.length < 2 || rows.length > 251) redirect("/admin/products/import?error=rows");

  const headers = rows[0].map((value, index) => (index === 0 ? value.replace(/^﻿/, "") : value).trim().toLowerCase());
  const required = ["name", "condition", "price_ngn", "opening_stock"];
  if (new Set(headers).size !== headers.length || required.some(header => !headers.includes(header))) redirect("/admin/products/import?error=headers");
  const { data: categories } = await supabase.from("categories").select("id,slug");
  const categoryIds = new Map((categories ?? []).map(category => [category.slug, category.id]));
  const seenSkus = new Set<string>();
  let imported = 0;
  let skipped = 0;
  let stockErrors = 0;

  for (let index = 1; index < rows.length; index++) {
    const raw = Object.fromEntries(headers.map((header, col) => [header, rows[index][col] ?? ""]));
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) { skipped++; continue; }
    const value = parsed.data;
    const sku = value.sku?.trim() || "";
    if (sku && seenSkus.has(sku.toLowerCase())) { skipped++; continue; }
    if (sku) seenSkus.add(sku.toLowerCase());
    const categoryId = value.category_slug ? categoryIds.get(value.category_slug) : undefined;
    if (value.category_slug && !categoryId) { skipped++; continue; }
    const baseSlug = slugify(value.name);
    if (!baseSlug) { skipped++; continue; }
    const slug = (baseSlug + "-" + (slugify(sku) || String(index))).slice(0, 150);
    const { data: product, error } = await supabase.from("products").insert({
      name: value.name,
      slug,
      category_id: categoryId ?? null,
      sku: sku || null,
      brand: value.brand || null,
      condition: value.condition,
      price: value.price_ngn,
      compare_at_price: value.compare_at_price_ngn ?? null,
      short_description: value.short_description || null,
      description: value.description || null,
      warranty_description: value.warranty_description || null,
      return_eligible: value.return_eligible ?? false,
      serial_tracking_required: value.serial_tracking_required ?? false,
      low_stock_threshold: value.low_stock_threshold,
      stock_quantity: 0,
      is_active: false,
      is_featured: false,
    }).select("id").single();
    if (error || !product) { skipped++; continue; }
    imported++;
    if (value.opening_stock > 0) {
      const { error: stockError } = await supabase.rpc("adjust_inventory", {
        p_product_id: product.id,
        p_quantity_delta: value.opening_stock,
        p_movement_type: "opening_balance",
        p_reference: "CSV inventory import",
        p_notes: "Opening quantity imported from reviewed CSV; product remains draft.",
      });
      if (stockError) stockErrors++;
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/import");
  revalidatePath("/products");
  revalidatePath("/");
  redirect(`/admin/products/import?imported=${imported}&skipped=${skipped}&stockErrors=${stockErrors}`);
}
