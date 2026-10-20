"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAnyScope } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CreateItemSchema = z.object({
  sku: z
    .string()
    .min(2, "SKU must be at least 2 characters")
    .max(50)
    .regex(/^[A-Z0-9_-]+$/i, "SKU must contain only alphanumeric characters, dashes, or underscores"),
  name: z.string().min(2, "Item name must be at least 2 characters").max(200),
  description: z.string().max(1000).optional().nullable(),
  categoryId: z.string().uuid("Invalid category identifier").optional().nullable(),
  kind: z.enum(["finished_good", "component", "accessory", "consumable", "packaging"]),
  uom: z.string().min(1, "Unit of measure is required").max(20),
  tracking: z.enum(["none", "lot", "serial"]),
});

export async function createItemAction(prevState: any, formData: FormData) {
  const session = await requireAnyScope(["catalog.write"]);

  const parsed = CreateItemSchema.safeParse({
    sku: formData.get("sku")?.toString()?.trim().toUpperCase(),
    name: formData.get("name")?.toString()?.trim(),
    description: formData.get("description")?.toString()?.trim() || null,
    categoryId: formData.get("category_id")?.toString() || null,
    kind: formData.get("kind"),
    uom: formData.get("uom")?.toString()?.trim(),
    tracking: formData.get("tracking"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const { sku, name, description, categoryId, kind, uom, tracking } = parsed.data;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `insert into catalog.items (sku, name, description, category_id, kind, uom, tracking) 
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id`,
      [sku, name, description, categoryId, kind, uom, tracking]
    );

    const itemId = result.rows[0].id;

    await client.query(
      `insert into core.audit_log (actor_id, action, entity_type, entity_id, after)
       values ($1, 'CREATE_ITEM', 'catalog.items', $2, $3::jsonb)`,
      [session.userId, itemId, JSON.stringify({ sku, name, kind, tracking })]
    );

    await client.query("COMMIT");
    revalidatePath("/catalogue");
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Item creation error:", error);
    if (error.code === "23505") {
      return { error: "An item with this SKU already exists." };
    }
    return { error: error.message || "Failed to create item." };
  } finally {
    client.release();
  }

  redirect("/catalogue");
}

const CreateCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").max(100),
  defaultTracking: z.enum(["none", "lot", "serial"]).default("serial"),
});

export async function createCategoryAction(data: { name: string; defaultTracking: string }) {
  try {
    const session = await requireAnyScope(["catalog.write"]);
    const parsed = CreateCategorySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
    }

    const { name, defaultTracking } = parsed.data;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `cat-${Date.now()}`;

    const result = await db.query(
      `INSERT INTO catalog.categories (name, slug, default_tracking)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name, slug`,
      [name, slug, defaultTracking]
    );

    const category = result.rows[0];

    await db.query(
      `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
       VALUES ($1, 'CREATE_CATEGORY', 'catalog.categories', $2, $3::jsonb)`,
      [session.userId, category.id, JSON.stringify({ name, slug, defaultTracking })]
    );

    revalidatePath("/catalogue");
    revalidatePath("/catalogue/items/new");

    return { success: true, category };
  } catch (error: any) {
    console.error("Failed to create category:", error);
    return { success: false, error: error.message || "Failed to create category" };
  }
}
