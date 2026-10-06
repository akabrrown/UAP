"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAnyScope } from "@/lib/session";

export async function createInvoiceAction(prevState: any, formData: FormData) {
  const session = await requireAnyScope(["finance.write"]);

  const customer_id = formData.get("customer_id")?.toString();
  const due_date = formData.get("due_date")?.toString();
  const currency = formData.get("currency")?.toString();
  const notes = formData.get("notes")?.toString();

  if (!customer_id || !due_date || !currency) {
    return { error: "Missing required fields." };
  }

  try {
    const result = await db.query(
      `insert into fin.invoices (customer_id, due_date, currency, created_by, notes)
       values ($1, $2, $3, $4, $5)
       returning id`,
      [customer_id, due_date, currency, session.userId, notes || null]
    );
  } catch (error: any) {
    console.error("Error creating invoice:", error);
    if (error.code === '23503') {
      return { error: "Invalid customer account UUID." };
    }
    return { error: "Failed to create invoice." };
  }

  redirect("/finance");
}
