"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAnyScope } from "@/lib/session";
import { z } from "zod";

const AddTransferLineSchema = z.object({
  transferId: z.string().uuid("Invalid transfer ID"),
  itemId: z.string().uuid("Please select a valid item"),
  qtySent: z.coerce.number().positive("Quantity sent must be greater than zero"),
});

const TransferActionSchema = z.object({
  transferId: z.string().uuid("Invalid transfer ID"),
});

export async function addTransferLineAction(formData: FormData) {
  await requireAnyScope(["inventory.issue", "inventory.receive"]);

  const parsed = AddTransferLineSchema.safeParse({
    transferId: formData.get("transfer_id"),
    itemId: formData.get("item_id"),
    qtySent: formData.get("qty_expected") || formData.get("qty_sent"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Validation failed");
  }

  const { transferId, itemId, qtySent } = parsed.data;

  try {
    await db.query(
      `
      insert into inv.transfer_lines (
        transfer_id, item_id, qty_sent
      ) 
      values ($1, $2, $3)
      `,
      [transferId, itemId, qtySent]
    );

    revalidatePath(`/inventory/transfers/${transferId}`);
  } catch (error: any) {
    console.error("Error adding transfer line:", error);
    throw new Error(error.message || "Failed to add item to transfer.");
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
    revalidatePath(`/inventory/transfers/${transferId}`);
  } catch (error: any) {
    console.error("Error receiving transfer:", error);
    throw new Error(error.message || "Failed to receive transfer.");
  }
}
