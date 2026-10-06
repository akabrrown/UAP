"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAnyScope } from "@/lib/session";

export async function createItemAction(prevState: any, formData: FormData) {
  await requireAnyScope(["catalogue.write"]);
  const sku = formData.get("sku")?.toString();
  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString() || null;
  const kind = formData.get("kind")?.toString();
  const uom = formData.get("uom")?.toString();
  const tracking = formData.get("tracking")?.toString();

  if (!sku || !name || !kind || !uom || !tracking) {
    return { error: "Missing required fields." };
  }

  try {
    await db.query(
      `insert into catalog.items (sku, name, description, kind, uom, tracking) 
       values ($1, $2, $3, $4, $5, $6)`,
      [sku, name, description, kind, uom, tracking]
    );
  } catch (error: any) {
    console.error(error);
    if (error.code === '23505') {
      return { error: "An item with this SKU already exists." };
    }
    return { error: "Failed to create item. Please check your inputs and try again." };
  }

  redirect("/catalogue");
}
