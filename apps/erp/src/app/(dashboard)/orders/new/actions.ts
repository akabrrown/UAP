"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAnyScope } from "@/lib/session";

export async function createInternalOrderAction(prevState: any, formData: FormData) {
  const session = await requireAnyScope(["sales.write"]);

  const account_id = formData.get("account_id")?.toString();
  const purpose = formData.get("purpose")?.toString();
  const required_by = formData.get("required_by")?.toString();
  const notes = formData.get("notes")?.toString();

  if (!account_id || !purpose || !required_by) {
    return { error: "Missing required fields." };
  }

  try {
    const result = await db.query(
      `insert into sales.internal_orders (account_id, purpose, required_by, status, requested_by, notes)
       values ($1, $2, $3, 'draft', $4, $5)
       returning id`,
      [account_id, purpose, required_by, session.userId, notes || null]
    );
  } catch (error: any) {
    console.error("Error creating internal order:", error);
    if (error.code === '23503') {
      return { error: "Invalid account UUID." };
    }
    return { error: "Failed to create internal order." };
  }

  redirect("/orders");
}
