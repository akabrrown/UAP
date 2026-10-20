"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

const ADJUSTMENT_THRESHOLD_GHS_MINOR = 50000; // GHS 500.00

export async function createAdjustment(data: {
  locationId: string;
  reason: string;
  notes?: string;
  lines: Array<{
    itemId: string;
    qtyDelta: number;
    unitCostMinor: number;
    note?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    let totalValueMinor = BigInt(0);
    for (const l of data.lines) {
      const val = BigInt(Math.abs(l.qtyDelta)) * BigInt(l.unitCostMinor || 0);
      totalValueMinor += val;
    }

    const needsApproval = Number(totalValueMinor) > ADJUSTMENT_THRESHOLD_GHS_MINOR;
    const initialStatus = needsApproval ? "pending_approval" : "posted";

    const adjRes = await client.query(
      `insert into inv.adjustments (
        adj_no, location_id, reason, status, total_value_minor,
        posted_at, notes
      ) values (
        core.next_doc_no('ADJ'), $1, $2, $3, $4,
        ${initialStatus === "posted" ? "now()" : "null"}, $5
      ) returning id, adj_no`,
      [
        data.locationId,
        data.reason,
        initialStatus,
        totalValueMinor.toString(),
        data.notes || null,
      ]
    );

    const adjId = adjRes.rows[0].id;
    const adjNo = adjRes.rows[0].adj_no;

    // Insert lines
    for (const l of data.lines) {
      await client.query(
        `insert into inv.adjustment_lines (
          adjustment_id, item_id, qty_delta, unit_cost_minor, note
        ) values ($1, $2, $3, $4, $5)`,
        [adjId, l.itemId, l.qtyDelta, l.unitCostMinor, l.note || null]
      );

      // If auto-posted, append directly to stock ledger per Section 07
      if (initialStatus === "posted") {
        await client.query(
          `insert into inv.stock_ledger (
            posted_at, item_id, location_id, movement_type, qty,
            unit_cost_minor, ref_type, ref_id, reason, created_by
          ) values (
            now(), $1, $2, 'adjustment', $3,
            $4, 'adjustment', $5, $6, $7
          )`,
          [
            l.itemId,
            data.locationId,
            l.qtyDelta,
            l.unitCostMinor,
            adjId,
            `Stock Adjustment ${adjNo}: ${data.reason}`,
            session.userId,
          ]
        );
      }
    }

    // If needs approval, insert approval request in core.approvals
    if (needsApproval) {
      const appRes = await client.query(
        `insert into core.approvals (
          action, entity_type, entity_id, requester_id, amount_minor,
          currency, reason, status
        ) values (
          'inventory.adjust.approve', 'inv.adjustments', $1, $2, $3,
          'GHS', $4, 'pending'
        ) returning id`,
        [
          adjId,
          session.userId,
          totalValueMinor.toString(),
          `Stock adjustment ${adjNo} exceeding threshold: ${data.reason}`,
        ]
      );

      await client.query(
        `update inv.adjustments set approval_id = $1 where id = $2`,
        [appRes.rows[0].id, adjId]
      );
    }

    // Audit log
    await client.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('inventory.adjust', 'inv.adjustments', $1, $2, $3)`,
      [
        adjId,
        session.userId,
        JSON.stringify({ adj_no: adjNo, totalValueMinor: totalValueMinor.toString(), status: initialStatus }),
      ]
    );

    await client.query("COMMIT");
    revalidatePath("/inventory/adjustments");
    revalidatePath("/inventory/ledger");
    return { success: true, adjId, adjNo, status: initialStatus };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("createAdjustment error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}
