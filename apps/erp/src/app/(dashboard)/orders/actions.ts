"use server";

import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function updateInternalOrderAction(
  orderId: string,
  data: {
    deliveryPoint?: string | null;
    requiredBy?: string | null;
    notes?: string | null;
  }
) {
  try {
    const session = await requireAnyScope(["orders.write"]);

    const orderCheck = await db.query(
      `SELECT status FROM sales.internal_orders WHERE id = $1`,
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      return { success: false, error: "Order not found" };
    }

    const currentStatus = orderCheck.rows[0].status;
    if (currentStatus === "completed" || currentStatus === "cancelled") {
      return { success: false, error: `Cannot edit order in '${currentStatus}' status` };
    }

    await db.query(
      `UPDATE sales.internal_orders
       SET delivery_point = coalesce($1, delivery_point),
           required_by = coalesce($2::date, required_by),
           notes = $3,
           updated_at = now()
       WHERE id = $4`,
      [
        data.deliveryPoint || null,
        data.requiredBy || null,
        data.notes || null,
        orderId,
      ]
    );

    await db.query(
      `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
       VALUES ($1, 'UPDATE_INTERNAL_ORDER', 'sales.internal_orders', $2, $3::jsonb)`,
      [session.userId, orderId, JSON.stringify(data)]
    );

    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update internal order:", err);
    return { success: false, error: err.message || "Failed to update order" };
  }
}

export async function deleteInternalOrderAction(orderId: string) {
  try {
    const session = await requireAnyScope(["orders.write"]);

    const orderRes = await db.query(
      `SELECT order_no, status FROM sales.internal_orders WHERE id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      return { success: false, error: "Order not found" };
    }

    const order = orderRes.rows[0];

    // Check for production assembly orders or dispatches referencing this order
    const aoCheck = await db.query(
      `SELECT count(*) as count FROM prod.assembly_orders WHERE purpose_doc_id = $1`,
      [orderId]
    );
    const hasLinkedWork = Number(aoCheck.rows[0]?.count || 0) > 0;

    if (hasLinkedWork || order.status !== "draft") {
      // Soft cancel to preserve audit trail
      await db.query(
        `UPDATE sales.internal_orders SET status = 'cancelled', updated_at = now() WHERE id = $1`,
        [orderId]
      );

      await db.query(
        `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
         VALUES ($1, 'CANCEL_INTERNAL_ORDER', 'sales.internal_orders', $2, '{"status": "cancelled"}'::jsonb)`,
        [session.userId, orderId]
      );

      revalidatePath(`/orders/${orderId}`);
      revalidatePath("/orders");
      return { success: true, cancelled: true };
    } else {
      // Hard delete draft lines and order
      await db.query(`DELETE FROM sales.internal_order_lines WHERE order_id = $1`, [orderId]);
      await db.query(`DELETE FROM sales.internal_orders WHERE id = $1`, [orderId]);

      await db.query(
        `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, before)
         VALUES ($1, 'DELETE_INTERNAL_ORDER', 'sales.internal_orders', $2, $3::jsonb)`,
        [session.userId, orderId, JSON.stringify({ order_no: order.order_no })]
      );

      revalidatePath("/orders");
      return { success: true, cancelled: false };
    }
  } catch (err: any) {
    console.error("Failed to delete order:", err);
    return { success: false, error: err.message || "Failed to delete order" };
  }
}
