"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAnyScope } from "@/lib/session";
import { z } from "zod";

const CreateAssemblyOrderSchema = z.object({
  bomField: z.string().min(1, "Bill of Materials is required"),
  qty: z.coerce.number().int().positive("Build quantity must be greater than zero"),
  priority: z.coerce.number().int().min(1).max(4).default(3),
  purpose: z.enum(["stock", "internal_order"]).default("stock"),
  internalOrderId: z.string().uuid().optional().nullable(),
  routingId: z.string().uuid().optional().nullable(),
  plannedStart: z.string().min(1, "Planned start date is required"),
  plannedEnd: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function createAssemblyOrderAction(prevState: any, formData: FormData) {
  const session = await requireAnyScope(["production.plan"]);

  const parsed = CreateAssemblyOrderSchema.safeParse({
    bomField: formData.get("bom_id"),
    qty: formData.get("qty"),
    priority: formData.get("priority") || 3,
    purpose: formData.get("purpose") || "stock",
    internalOrderId: formData.get("internal_order_id")?.toString() || null,
    routingId: formData.get("routing_id")?.toString() || null,
    plannedStart: formData.get("planned_start"),
    plannedEnd: formData.get("planned_end")?.toString() || null,
    notes: formData.get("notes")?.toString() || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input parameters" };
  }

  const {
    bomField,
    qty,
    priority,
    purpose,
    internalOrderId,
    routingId,
    plannedStart,
    plannedEnd,
    notes,
  } = parsed.data;

  const [bom_id, item_id] = bomField.split("|");
  if (!bom_id || !item_id) {
    return { error: "Invalid BOM format selected" };
  }

  try {
    await db.query(
      `insert into prod.assembly_orders (
        ao_no, bom_id, item_id, routing_id, qty_planned, status,
        priority, purpose, internal_order_id, planned_start, planned_end,
        requested_by, notes
      ) values (
        core.next_doc_no('AO'), $1, $2, $3, $4, 'draft',
        $5, $6, $7, $8, $9,
        $10, $11
      )`,
      [
        bom_id,
        item_id,
        routingId,
        qty,
        priority,
        purpose,
        purpose === "internal_order" ? internalOrderId : null,
        plannedStart,
        plannedEnd,
        session.userId,
        notes,
      ]
    );
  } catch (error: any) {
    console.error("Error creating assembly order:", error);
    if (error.code === "23503") {
      return { error: "Foreign key reference error (invalid BOM, routing, or order)." };
    }
    return { error: error.message || "Failed to create assembly order." };
  }

  redirect("/production");
}
