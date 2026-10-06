"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export async function createAssemblyOrderAction(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const bom_id = formData.get("bom_id")?.toString();
  const qty = formData.get("qty")?.toString();
  const planned_start = formData.get("planned_start")?.toString();
  const notes = formData.get("notes")?.toString();

  if (!bom_id || !qty || !planned_start) {
    return { error: "Missing required fields." };
  }

  try {
    const bomRes = await db.query(`select item_id from catalog.boms where id = $1`, [bom_id]);
    if (bomRes.rows.length === 0) return { error: "BOM not found." };
    const item_id = bomRes.rows[0].item_id;

    const result = await db.query(
      `insert into prod.assembly_orders (bom_id, item_id, qty_planned, planned_start, status, notes)
       values ($1, $2, $3, $4, 'draft', $5)
       returning id`,
      [bom_id, item_id, qty, planned_start, notes || null]
    );
  } catch (error: any) {
    console.error("Error creating assembly order:", error);
    if (error.code === '23503') {
      return { error: "Invalid BOM UUID." };
    }
    return { error: "Failed to create assembly order." };
  }

  redirect("/production");
}
