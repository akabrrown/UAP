"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAnyScope } from "@/lib/session";

export async function addBomLineAction(prevState: any, formData: FormData) {
  try {
    // IDOR protection & authorization
    const session = await requireAnyScope(["catalog.write"]);

    const bomId = formData.get("bomId") as string;
    const itemId = formData.get("itemId") as string;
    const componentId = formData.get("componentId") as string;
    const qty = parseFloat(formData.get("qty") as string);
    const scrapPct = parseFloat(formData.get("scrapPct") as string) || 0;

    if (!bomId || !componentId || !qty) {
      return { error: "Missing required fields." };
    }
    
    if (qty <= 0) {
      return { error: "Quantity must be greater than 0." };
    }

    if (itemId === componentId) {
      return { error: "An item cannot be a component of its own BOM." };
    }

    // Verify BOM exists and is in draft status
    const bomRes = await db.query("select status from catalog.boms where id = $1", [bomId]);
    if (bomRes.rows.length === 0) {
      return { error: "BOM not found." };
    }
    if (bomRes.rows[0].status !== "draft") {
      return { error: "Cannot modify a BOM that is not in draft status." };
    }

    // Verify component item exists
    const componentRes = await db.query("select id from catalog.items where id = $1", [componentId]);
    if (componentRes.rows.length === 0) {
      return { error: "Component item not found." };
    }

    await db.query(
      `insert into catalog.bom_lines 
        (bom_id, component_item_id, qty, scrap_pct) 
       values 
        ($1, $2, $3, $4)`,
      [bomId, componentId, qty, scrapPct]
    );

    revalidatePath(`/catalogue/items/${itemId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to add BOM line:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
}

export async function updateItemCategoryAction(itemId: string, categoryId: string | null) {
  try {
    const session = await requireAnyScope(["catalog.write"]);
    await db.query(
      `UPDATE catalog.items SET category_id = $1 WHERE id = $2`,
      [categoryId || null, itemId]
    );

    await db.query(
      `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
       VALUES ($1, 'UPDATE_ITEM_CATEGORY', 'catalog.items', $2, $3::jsonb)`,
      [session.userId, itemId, JSON.stringify({ category_id: categoryId })]
    );

    revalidatePath(`/catalogue/items/${itemId}`);
    revalidatePath("/catalogue");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update item category:", error);
    return { success: false, error: error.message || "Failed to update category" };
  }
}

export async function deleteBomLineAction(lineId: string, itemId: string) {
  try {
    const session = await requireAnyScope(["catalog.write"]);
    
    // Ensure BOM is in draft status
    const lineCheck = await db.query(
      `SELECT bl.id, b.status, bl.component_item_id
       FROM catalog.bom_lines bl
       JOIN catalog.boms b ON b.id = bl.bom_id
       WHERE bl.id = $1`,
      [lineId]
    );

    if (lineCheck.rows.length === 0) {
      return { success: false, error: "BOM line not found" };
    }

    if (lineCheck.rows[0].status !== "draft") {
      return { success: false, error: "Cannot delete components from a published BOM" };
    }

    await db.query(`DELETE FROM catalog.bom_lines WHERE id = $1`, [lineId]);

    await db.query(
      `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, before)
       VALUES ($1, 'DELETE_BOM_LINE', 'catalog.bom_lines', $2, $3::jsonb)`,
      [session.userId, lineId, JSON.stringify(lineCheck.rows[0])]
    );

    revalidatePath(`/catalogue/items/${itemId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete BOM line:", error);
    return { success: false, error: error.message || "Failed to delete component line" };
  }
}

export async function updateItemDetailsAction(
  itemId: string,
  data: {
    name: string;
    description?: string | null;
    uom: string;
    tracking: "none" | "lot" | "serial";
    isActive: boolean;
  }
) {
  try {
    const session = await requireAnyScope(["catalog.write"]);

    if (!data.name || data.name.trim().length < 2) {
      return { success: false, error: "Item name must be at least 2 characters" };
    }

    await db.query(
      `UPDATE catalog.items 
       SET name = $1, description = $2, uom = $3, tracking = $4, is_active = $5, updated_at = now()
       WHERE id = $6`,
      [data.name.trim(), data.description || null, data.uom, data.tracking, data.isActive, itemId]
    );

    await db.query(
      `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
       VALUES ($1, 'UPDATE_ITEM', 'catalog.items', $2, $3::jsonb)`,
      [session.userId, itemId, JSON.stringify(data)]
    );

    revalidatePath(`/catalogue/items/${itemId}`);
    revalidatePath("/catalogue");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update item:", error);
    return { success: false, error: error.message || "Failed to update item" };
  }
}

export async function deleteItemAction(itemId: string) {
  try {
    const session = await requireAnyScope(["catalog.write"]);

    // Check if referenced in operational records
    const refCheck = await db.query(
      `SELECT 
        (SELECT count(*) FROM inv.stock_ledger WHERE item_id = $1) as ledger_refs,
        (SELECT count(*) FROM proc.purchase_order_lines WHERE item_id = $1) as po_refs,
        (SELECT count(*) FROM sales.internal_order_lines WHERE item_id = $1) as order_refs,
        (SELECT count(*) FROM prod.assembly_orders WHERE item_id = $1) as ao_refs,
        (SELECT count(*) FROM prod.units WHERE item_id = $1) as unit_refs,
        (SELECT count(*) FROM fin.invoice_lines WHERE item_id = $1) as invoice_refs,
        (SELECT count(*) FROM svc.service_parts WHERE item_id = $1) as svc_refs,
        (SELECT count(*) FROM catalog.bom_lines WHERE component_item_id = $1) as bom_comp_refs,
        (SELECT count(*) FROM catalog.boms WHERE item_id = $1 AND status != 'draft') as active_bom_refs`,
      [itemId]
    );

    const hasOperationalHistory =
      Number(refCheck.rows[0]?.ledger_refs || 0) > 0 ||
      Number(refCheck.rows[0]?.po_refs || 0) > 0 ||
      Number(refCheck.rows[0]?.order_refs || 0) > 0 ||
      Number(refCheck.rows[0]?.ao_refs || 0) > 0 ||
      Number(refCheck.rows[0]?.unit_refs || 0) > 0 ||
      Number(refCheck.rows[0]?.invoice_refs || 0) > 0 ||
      Number(refCheck.rows[0]?.svc_refs || 0) > 0 ||
      Number(refCheck.rows[0]?.bom_comp_refs || 0) > 0 ||
      Number(refCheck.rows[0]?.active_bom_refs || 0) > 0;

    if (hasOperationalHistory) {
      // Soft-delete / deactivate to preserve audit & ledger integrity
      await db.query(`UPDATE catalog.items SET is_active = false, updated_at = now() WHERE id = $1`, [itemId]);
      await db.query(
        `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
         VALUES ($1, 'DEACTIVATE_ITEM', 'catalog.items', $2, '{"is_active": false}'::jsonb)`,
        [session.userId, itemId]
      );

      revalidatePath("/catalogue");
      revalidatePath(`/catalogue/items/${itemId}`);
      return { success: true, deactivated: true };
    }

    // Completely unreferenced or draft item - attempt safe removal of metadata and item
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Delete draft BOMs for this item (bom_lines cascade on delete)
      await client.query(`DELETE FROM catalog.boms WHERE item_id = $1`, [itemId]);

      // Delete price list entries and supplier mappings if any
      await client.query(`DELETE FROM catalog.price_list_items WHERE item_id = $1`, [itemId]);
      await client.query(`DELETE FROM catalog.item_suppliers WHERE item_id = $1`, [itemId]);

      // Delete the item record
      await client.query(`DELETE FROM catalog.items WHERE id = $1`, [itemId]);

      // Audit log
      await client.query(
        `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, before)
         VALUES ($1, 'DELETE_ITEM', 'catalog.items', $2, $3::jsonb)`,
        [session.userId, itemId, JSON.stringify({ id: itemId })]
      );

      await client.query("COMMIT");
      revalidatePath("/catalogue");
      return { success: true, deactivated: false };
    } catch (dbErr: any) {
      await client.query("ROLLBACK");

      // If a foreign key constraint prevents deletion, fall back gracefully to soft deactivation
      if (dbErr.code === "23503") {
        await db.query(`UPDATE catalog.items SET is_active = false, updated_at = now() WHERE id = $1`, [itemId]);
        await db.query(
          `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
           VALUES ($1, 'DEACTIVATE_ITEM', 'catalog.items', $2, '{"is_active": false}'::jsonb)`,
          [session.userId, itemId]
        );
        revalidatePath("/catalogue");
        revalidatePath(`/catalogue/items/${itemId}`);
        return { success: true, deactivated: true };
      }

      throw dbErr;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Failed to delete item:", error);
    return { success: false, error: error.message || "Failed to delete item" };
  }
}
