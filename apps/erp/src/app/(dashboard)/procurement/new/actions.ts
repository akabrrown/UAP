"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAnyScope } from "@/lib/session";

export async function createPurchaseOrderAction(prevState: any, formData: FormData) {
  await requireAnyScope(["procurement.write"]);
  const supplier_id = formData.get("supplier_id")?.toString();
  const currency = formData.get("currency")?.toString();
  const expected_arrival = formData.get("expected_arrival")?.toString() || null;

  if (!supplier_id || !currency) {
    return { error: "Missing required fields." };
  }

  try {
    await db.query(
      `insert into proc.purchase_orders (supplier_id, currency, expected_arrival_date, status) 
       values ($1, $2, $3, 'draft')`,
      [supplier_id, currency, expected_arrival]
    );
  } catch (error: any) {
    console.error(error);
    return { error: "Failed to create purchase order. Please check your inputs." };
  }

  redirect("/procurement");
}
