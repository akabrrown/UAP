"use server";

import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function updatePurchaseOrderAction(
  poId: string,
  data: {
    expectedArrivalDate?: string | null;
    shippingMode?: string;
    incoterm?: string;
    notes?: string | null;
  }
) {
  try {
    const session = await requireAnyScope(["procurement.write"]);

    const poCheck = await db.query(
      `SELECT status FROM proc.purchase_orders WHERE id = $1`,
      [poId]
    );

    if (poCheck.rows.length === 0) {
      return { success: false, error: "Purchase order not found" };
    }

    const currentStatus = poCheck.rows[0].status;
    if (currentStatus === "closed" || currentStatus === "cancelled") {
      return { success: false, error: `Cannot edit order in '${currentStatus}' status` };
    }

    await db.query(
      `UPDATE proc.purchase_orders
       SET expected_arrival_date = $1,
           shipping_mode = coalesce($2, shipping_mode),
           incoterm = coalesce($3, incoterm),
           notes = $4,
           updated_at = now()
       WHERE id = $5`,
      [
        data.expectedArrivalDate || null,
        data.shippingMode || null,
        data.incoterm || null,
        data.notes || null,
        poId,
      ]
    );

    await db.query(
      `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
       VALUES ($1, 'UPDATE_PURCHASE_ORDER', 'proc.purchase_orders', $2, $3::jsonb)`,
      [session.userId, poId, JSON.stringify(data)]
    );

    revalidatePath(`/procurement/${poId}`);
    revalidatePath("/procurement");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update purchase order:", err);
    return { success: false, error: err.message || "Failed to update purchase order" };
  }
}

export async function deletePurchaseOrderAction(poId: string) {
  try {
    const session = await requireAnyScope(["procurement.write"]);

    // Check if PO exists and if there are any receipts
    const poRes = await db.query(
      `SELECT po_no, status FROM proc.purchase_orders WHERE id = $1`,
      [poId]
    );

    if (poRes.rows.length === 0) {
      return { success: false, error: "Purchase order not found" };
    }

    const po = poRes.rows[0];

    // Check for goods receipt notes
    const grnCheck = await db.query(
      `SELECT count(*) as count FROM proc.goods_receipt_notes WHERE po_id = $1`,
      [poId]
    );

    const hasReceipts = Number(grnCheck.rows[0]?.count || 0) > 0;

    if (hasReceipts || po.status !== "draft") {
      // Soft cancel to preserve audit trail
      await db.query(
        `UPDATE proc.purchase_orders SET status = 'cancelled', updated_at = now() WHERE id = $1`,
        [poId]
      );

      await db.query(
        `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
         VALUES ($1, 'CANCEL_PURCHASE_ORDER', 'proc.purchase_orders', $2, '{"status": "cancelled"}'::jsonb)`,
        [session.userId, poId]
      );

      revalidatePath(`/procurement/${poId}`);
      revalidatePath("/procurement");
      return { success: true, cancelled: true };
    } else {
      // Hard delete draft lines and order
      await db.query(`DELETE FROM proc.purchase_order_lines WHERE po_id = $1`, [poId]);
      await db.query(`DELETE FROM proc.purchase_orders WHERE id = $1`, [poId]);

      await db.query(
        `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, before)
         VALUES ($1, 'DELETE_PURCHASE_ORDER', 'proc.purchase_orders', $2, $3::jsonb)`,
        [session.userId, poId, JSON.stringify({ po_no: po.po_no })]
      );

      revalidatePath("/procurement");
      return { success: true, cancelled: false };
    }
  } catch (err: any) {
    console.error("Failed to delete purchase order:", err);
    return { success: false, error: err.message || "Failed to delete purchase order" };
  }
}
