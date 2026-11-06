"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAnyScope } from "@/lib/session";
import { z } from "zod";

const AddTransferLineSchema = z.object({
  transferId: z.string().uuid("Invalid transfer ID"),
  itemId: z.string().uuid("Please select a valid item"),
  lotNo: z.string().trim().max(100).optional().nullable(),
  qtySent: z.coerce.number().positive("Quantity sent must be greater than zero"),
});

const DeleteTransferLineSchema = z.object({
  transferId: z.string().uuid("Invalid transfer ID"),
  lineId: z.string().uuid("Invalid line ID"),
});

const TransferActionSchema = z.object({
  transferId: z.string().uuid("Invalid transfer ID"),
});

export async function addTransferLineAction(formData: FormData) {
  await requireAnyScope(["inventory.issue", "inventory.receive"]);

  const rawLotNo = formData.get("lot_no");
  const lotNoStr = rawLotNo ? String(rawLotNo).trim() : null;

  const parsed = AddTransferLineSchema.safeParse({
    transferId: formData.get("transfer_id"),
    itemId: formData.get("item_id"),
    lotNo: lotNoStr && lotNoStr.length > 0 ? lotNoStr : null,
    qtySent: formData.get("qty_expected") || formData.get("qty_sent"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Validation failed");
  }

  const { transferId, itemId, lotNo, qtySent } = parsed.data;

  try {
    let lotId: string | null = null;
    if (lotNo) {
      const existingLot = await db.query(
        `select id from inv.lots where item_id = $1 and lot_no = $2 order by created_at desc limit 1`,
        [itemId, lotNo]
      );
      if (existingLot.rows.length > 0) {
        lotId = existingLot.rows[0].id;
      } else {
        const newLot = await db.query(
          `insert into inv.lots (item_id, lot_no, received_on) values ($1, $2, current_date) returning id`,
          [itemId, lotNo]
        );
        lotId = newLot.rows[0].id;
      }
    }

    await db.query(
      `
      insert into inv.transfer_lines (
        transfer_id, item_id, lot_id, qty_sent
      ) 
      values ($1, $2, $3, $4)
      `,
      [transferId, itemId, lotId, qtySent]
    );

    revalidatePath(`/inventory/transfers/${transferId}`);
  } catch (error: any) {
    console.error("Error adding transfer line:", error);
    throw new Error(error.message || "Failed to add item to transfer.");
  }
}

export async function deleteTransferLineAction(formData: FormData) {
  await requireAnyScope(["inventory.issue", "inventory.receive"]);

  const parsed = DeleteTransferLineSchema.safeParse({
    transferId: formData.get("transfer_id"),
    lineId: formData.get("line_id"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Validation failed");
  }

  const { transferId, lineId } = parsed.data;

  try {
    const transferRes = await db.query(`select status from inv.transfers where id = $1`, [transferId]);
    if (transferRes.rows.length === 0) {
      throw new Error("Transfer not found");
    }
    if (transferRes.rows[0].status !== "draft") {
      throw new Error("Cannot remove items from a transfer that is not in draft status");
    }

    await db.query(`delete from inv.transfer_lines where id = $1 and transfer_id = $2`, [lineId, transferId]);
    revalidatePath(`/inventory/transfers/${transferId}`);
  } catch (error: any) {
    console.error("Error deleting transfer line:", error);
    throw new Error(error.message || "Failed to delete item from transfer.");
  }
}

export async function shipTransferAction(formData: FormData) {
  const session = await requireAnyScope(["inventory.issue"]);

  const parsed = TransferActionSchema.safeParse({
    transferId: formData.get("transfer_id"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Validation failed");
  }

  const { transferId } = parsed.data;

  try {
    await db.query(`select inv.post_transfer_shipment($1, $2)`, [transferId, session.userId]);
    revalidatePath(`/inventory/transfers/${transferId}`);
  } catch (error: any) {
    console.error("Error shipping transfer:", error);
    throw new Error(error.message || "Failed to ship transfer.");
  }
}

export async function receiveTransferAction(formData: FormData) {
  const session = await requireAnyScope(["inventory.receive"]);

  const parsed = TransferActionSchema.safeParse({
    transferId: formData.get("transfer_id"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Validation failed");
  }

  const { transferId } = parsed.data;

  try {
    await db.query(`select inv.post_transfer_receipt($1, $2)`, [transferId, session.userId]);
    await db.query(
      `update inv.transfer_lines set qty_received = coalesce(qty_received, qty_sent) where transfer_id = $1 and qty_received is null`,
      [transferId]
    );
    revalidatePath(`/inventory/transfers/${transferId}`);
  } catch (error: any) {
    console.error("Error receiving transfer:", error);
    throw new Error(error.message || "Failed to receive transfer.");
  }
}
