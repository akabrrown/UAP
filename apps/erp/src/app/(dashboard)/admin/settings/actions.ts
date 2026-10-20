"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function addExchangeRateAction(data: {
  currency_code: string;
  rate_to_base: number;
  effective_on: string;
  source: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    const res = await db.query(
      `insert into core.exchange_rates (
        currency_code, rate_to_base, effective_on, source
      ) values ($1, $2, $3, $4)
      returning id`,
      [
        data.currency_code.toUpperCase(),
        data.rate_to_base,
        data.effective_on,
        data.source.trim(),
      ]
    );

    await db.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('exchange_rate.create', 'core.exchange_rates', $1, $2, $3)`,
      [res.rows[0].id, session.userId, JSON.stringify(data)]
    );

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err: any) {
    if (err.code === "23505") {
      return { success: false, error: "An exchange rate for this currency, date, and source already exists." };
    }
    console.error("addExchangeRateAction error:", err);
    return { success: false, error: err.message };
  }
}

export async function addTaxRateAction(data: {
  code: string;
  name: string;
  kind: "vat" | "levy" | "withholding";
  rate_pct: number;
  effective_from: string;
  effective_to?: string | null;
  recoverable?: boolean;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    const res = await db.query(
      `insert into core.tax_rates (
        code, name, kind, rate_pct, effective_from, effective_to, recoverable
      ) values ($1, $2, $3, $4, $5, $6, $7)
      returning id`,
      [
        data.code.toUpperCase(),
        data.name.trim(),
        data.kind,
        data.rate_pct,
        data.effective_from,
        data.effective_to || null,
        data.recoverable !== false,
      ]
    );

    await db.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('tax_rate.create', 'core.tax_rates', $1, $2, $3)`,
      [res.rows[0].id, session.userId, JSON.stringify(data)]
    );

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err: any) {
    if (err.code === "23505") {
      return { success: false, error: "A tax rate with this code and effective start date already exists." };
    }
    console.error("addTaxRateAction error:", err);
    return { success: false, error: err.message };
  }
}

export async function addLocationAction(data: {
  code: string;
  name: string;
  kind: "warehouse" | "assembly_wip" | "repair_bench" | "quarantine" | "in_transit" | "dispatch" | "showroom";
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    const res = await db.query(
      `insert into core.locations (
        code, name, kind, active
      ) values ($1, $2, $3, true)
      returning id`,
      [data.code.toUpperCase().trim(), data.name.trim(), data.kind]
    );

    await db.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('location.create', 'core.locations', $1, $2, $3)`,
      [res.rows[0].id, session.userId, JSON.stringify(data)]
    );

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err: any) {
    if (err.code === "23505") {
      return { success: false, error: "A location with this code already exists." };
    }
    console.error("addLocationAction error:", err);
    return { success: false, error: err.message };
  }
}

export async function updateLocationAction(
  locationId: string,
  data: {
    name: string;
    kind: "warehouse" | "assembly_wip" | "repair_bench" | "quarantine" | "in_transit" | "dispatch" | "showroom";
    active: boolean;
  }
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    await db.query(
      `update core.locations
       set name = $1, kind = $2, active = $3, updated_at = now()
       where id = $4`,
      [data.name.trim(), data.kind, data.active, locationId]
    );

    await db.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('location.update', 'core.locations', $1, $2, $3)`,
      [locationId, session.userId, JSON.stringify(data)]
    );

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err: any) {
    console.error("updateLocationAction error:", err);
    return { success: false, error: err.message };
  }
}

export async function updateDocSequenceAction(
  series: string,
  year: number,
  next_value: number
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    await db.query(
      `insert into core.doc_sequences (series, year, next_value)
       values ($1, $2, $3)
       on conflict (series, year)
       do update set next_value = $3`,
      [series.toUpperCase(), year, next_value]
    );

    await db.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('doc_sequence.update', 'core.doc_sequences', $1, $2, $3)`,
      [`${series}-${year}`, session.userId, JSON.stringify({ series, year, next_value })]
    );

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err: any) {
    console.error("updateDocSequenceAction error:", err);
    return { success: false, error: err.message };
  }
}

export async function saveGeneralSettingAction(key: string, value: any, description?: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    await db.query(
      `insert into core.settings (key, value, description, updated_at, updated_by)
       values ($1, $2, $3, now(), $4)
       on conflict (key)
       do update set value = $2, description = coalesce($3, core.settings.description), updated_at = now(), updated_by = $4`,
      [key, JSON.stringify(value), description || null, session.userId]
    );

    await db.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('setting.update', 'core.settings', $1, $2, $3)`,
      [key, session.userId, JSON.stringify({ key, value })]
    );

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err: any) {
    console.error("saveGeneralSettingAction error:", err);
    return { success: false, error: err.message };
  }
}
