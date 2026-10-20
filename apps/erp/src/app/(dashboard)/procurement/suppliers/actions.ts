"use server";

import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function createSupplierAction(formData: FormData) {
  const session = await requireAnyScope(["suppliers.write", "procurement.write"]);

  const name = formData.get("name")?.toString().trim();
  const country = formData.get("country")?.toString().trim() || "GH";
  const kind = formData.get("kind")?.toString().trim() || "distributor";
  const tin = formData.get("tin")?.toString().trim() || null;
  const contactName = formData.get("contactName")?.toString().trim() || null;
  const email = formData.get("email")?.toString().trim() || null;
  const phone = formData.get("phone")?.toString().trim() || null;
  const address = formData.get("address")?.toString().trim() || null;
  const currency = formData.get("currency")?.toString().trim() || "GHS";
  const paymentTerms = formData.get("paymentTerms")?.toString().trim() || "30_days";
  const leadTimeDays = parseInt(formData.get("leadTimeDays")?.toString() || "14", 10);
  const status = formData.get("status")?.toString().trim() || "active";
  const notes = formData.get("notes")?.toString().trim() || null;

  if (!name) {
    return { error: "Supplier name is required" };
  }

  const supplierNo = `SUP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const res = await db.query(
      `insert into proc.suppliers (
        supplier_no, name, country, kind, tin, contact_name, email, phone, 
        address, currency, payment_terms, lead_time_days, status, notes
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      returning id, supplier_no, name, status, currency`,
      [supplierNo, name, country, kind, tin, contactName, email, phone, address, currency, paymentTerms, leadTimeDays, status, notes]
    );

    const newSupplier = res.rows[0];

    // Append to audit log
    await db.query(
      `insert into core.audit_log (
        actor_id, action, entity_type, entity_id, after
      ) values ($1, 'CREATE_SUPPLIER', 'proc.suppliers', $2, $3)`,
      [
        session.userId,
        newSupplier.id,
        JSON.stringify({
          supplier_no: newSupplier.supplier_no,
          name: newSupplier.name,
          country,
          kind,
          currency,
          status: newSupplier.status,
        }),
      ]
    );

    revalidatePath("/procurement/suppliers");
    revalidatePath("/procurement/new");
    return { success: true, supplierId: newSupplier.id };
  } catch (err: any) {
    console.error("Failed to create supplier:", err);
    return { error: err.message || "Failed to create supplier record" };
  }
}

export async function updateSupplierAction(
  supplierId: string,
  data: {
    name: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    status: "active" | "on_hold" | "blocked" | "pending_verification";
    paymentTerms: string;
    currency: string;
  }
) {
  try {
    const session = await requireAnyScope(["suppliers.write", "procurement.write"]);

    if (!data.name || data.name.trim().length < 2) {
      return { success: false, error: "Supplier name must be at least 2 characters" };
    }

    await db.query(
      `UPDATE proc.suppliers 
       SET name = $1, contact_name = $2, email = $3, phone = $4, status = $5, 
           payment_terms = $6, currency = $7, updated_at = now()
       WHERE id = $8`,
      [
        data.name.trim(),
        data.contactName || null,
        data.email || null,
        data.phone || null,
        data.status,
        data.paymentTerms,
        data.currency,
        supplierId,
      ]
    );

    await db.query(
      `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
       VALUES ($1, 'UPDATE_SUPPLIER', 'proc.suppliers', $2, $3::jsonb)`,
      [session.userId, supplierId, JSON.stringify(data)]
    );

    revalidatePath("/procurement/suppliers");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update supplier:", err);
    return { success: false, error: err.message || "Failed to update supplier record" };
  }
}

export async function deleteSupplierAction(supplierId: string) {
  try {
    const session = await requireAnyScope(["suppliers.write", "procurement.write"]);

    // Check if supplier has any purchase orders
    const poCheck = await db.query(
      `SELECT count(*) as count FROM proc.purchase_orders WHERE supplier_id = $1`,
      [supplierId]
    );

    const hasOrders = Number(poCheck.rows[0]?.count || 0) > 0;

    if (hasOrders) {
      // Set to blocked to protect PO historical records
      await db.query(`UPDATE proc.suppliers SET status = 'blocked', updated_at = now() WHERE id = $1`, [supplierId]);
      await db.query(
        `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
         VALUES ($1, 'BLOCK_SUPPLIER', 'proc.suppliers', $2, '{"status": "blocked"}'::jsonb)`,
        [session.userId, supplierId]
      );
    } else {
      await db.query(`DELETE FROM proc.suppliers WHERE id = $1`, [supplierId]);
      await db.query(
        `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, before)
         VALUES ($1, 'DELETE_SUPPLIER', 'proc.suppliers', $2, $3::jsonb)`,
        [session.userId, supplierId, JSON.stringify({ id: supplierId })]
      );
    }

    revalidatePath("/procurement/suppliers");
    return { success: true, blocked: hasOrders };
  } catch (err: any) {
    console.error("Failed to delete supplier:", err);
    return { success: false, error: err.message || "Failed to delete supplier record" };
  }
}
