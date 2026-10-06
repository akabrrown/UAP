"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAnyScope } from "@/lib/session";

export async function createTransferAction(prevState: any, formData: FormData) {
  await requireAnyScope(["inventory.write"]);
  const from_location_id = formData.get("from_location_id")?.toString() || null;
  const to_location_id = formData.get("to_location_id")?.toString();

  if (!to_location_id) {
    return { error: "Destination location is required." };
  }

  if (from_location_id === to_location_id) {
    return { error: "Source and destination locations cannot be the same." };
  }

  try {
    await db.query(
      `insert into inv.transfers (from_location_id, to_location_id, status) 
       values ($1, $2, 'draft')`,
      [from_location_id, to_location_id]
    );
  } catch (error: any) {
    console.error(error);
    return { error: "Failed to create transfer. Please check your inputs." };
  }

  redirect("/inventory");
}
