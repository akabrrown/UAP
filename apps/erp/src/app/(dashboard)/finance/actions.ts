"use server";

import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function recordPaymentAction(formData: FormData) {
  const session = await requireAnyScope(["payments.write", "invoices.write"]);

  const direction = formData.get("direction")?.toString().trim() || "in";
  const partyType = formData.get("partyType")?.toString().trim() || "account";
  const partyId = formData.get("partyId")?.toString().trim() || null;
  const method = formData.get("method")?.toString().trim() || "bank_transfer";
  const amountStr = formData.get("amount")?.toString().trim();
  const currency = formData.get("currency")?.toString().trim() || "GHS";
  const reference = formData.get("reference")?.toString().trim() || null;
  const paidOn = formData.get("paidOn")?.toString().trim() || new Date().toISOString().slice(0, 10);
  const notes = formData.get("notes")?.toString().trim() || null;

  const amountMinor = Math.round(parseFloat(amountStr || "0") * 100);
  if (!amountMinor || amountMinor <= 0) {
    return { error: "Payment amount must be greater than zero." };
  }

  const paymentNo = `PAY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const res = await db.query(
      `insert into fin.payments (
        payment_no, direction, party_type, party_id, method, amount_minor, 
        currency, amount_base_minor, status, reference, paid_on, notes
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'cleared', $9, $10, $11)
      returning id, payment_no, amount_minor, currency`,
      [paymentNo, direction, partyType, partyId, method, amountMinor, currency, amountMinor, reference, paidOn, notes]
    );

    const payment = res.rows[0];

    // Audit trail
    await db.query(
      `insert into core.audit_log (
        actor_id, action, entity_type, entity_id, after
      ) values ($1, 'RECORD_PAYMENT', 'fin.payments', $2, $3)`,
      [
        session.userId,
        payment.id,
        JSON.stringify({
          payment_no: payment.payment_no,
          amount_minor: payment.amount_minor,
          currency: payment.currency,
          method,
          direction,
        }),
      ]
    );

    revalidatePath("/finance");
    return { success: true, paymentId: payment.id };
  } catch (err: any) {
    console.error("Failed to record payment:", err);
    return { error: err.message || "Failed to record payment." };
  }
}

export async function submitExpenseAction(formData: FormData) {
  const session = await requireAnyScope(["expenses.submit", "invoices.write"]);

  const categoryId = formData.get("categoryId")?.toString().trim();
  const amountStr = formData.get("amount")?.toString().trim();
  const currency = formData.get("currency")?.toString().trim() || "GHS";
  const paidTo = formData.get("paidTo")?.toString().trim() || null;
  const expenseDate = formData.get("expenseDate")?.toString().trim() || new Date().toISOString().slice(0, 10);
  const notes = formData.get("notes")?.toString().trim() || null;

  const amountMinor = Math.round(parseFloat(amountStr || "0") * 100);
  if (!amountMinor || amountMinor <= 0) {
    return { error: "Expense amount must be greater than zero." };
  }

  // Get or create fallback category if not provided
  let catId = categoryId;
  if (!catId) {
    const catRes = await db.query(`select id from fin.expense_categories limit 1`);
    if (catRes.rows.length > 0) {
      catId = catRes.rows[0].id;
    } else {
      const newCat = await db.query(
        `insert into fin.expense_categories (name) values ('Operational Supplies') returning id`
      );
      catId = newCat.rows[0].id;
    }
  }

  const expenseNo = `EXP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const res = await db.query(
      `insert into fin.expenses (
        expense_no, category_id, amount_minor, currency, paid_to, expense_date, status, notes
      ) values ($1, $2, $3, $4, $5, $6, 'pending_approval', $7)
      returning id, expense_no, amount_minor, currency`,
      [expenseNo, catId, amountMinor, currency, paidTo, expenseDate, notes]
    );

    const expense = res.rows[0];

    // Audit trail
    await db.query(
      `insert into core.audit_log (
        actor_id, action, entity_type, entity_id, after
      ) values ($1, 'SUBMIT_EXPENSE', 'fin.expenses', $2, $3)`,
      [
        session.userId,
        expense.id,
        JSON.stringify({
          expense_no: expense.expense_no,
          amount_minor: expense.amount_minor,
          currency: expense.currency,
          paid_to: paidTo,
          status: "pending_approval",
        }),
      ]
    );

    revalidatePath("/finance");
    return { success: true, expenseId: expense.id };
  } catch (err: any) {
    console.error("Failed to submit expense:", err);
    return { error: err.message || "Failed to submit expense claim." };
  }
}

export async function updateExpenseAction(
  expenseId: string,
  data: {
    amount?: number;
    paidTo?: string | null;
    expenseDate?: string;
    notes?: string | null;
  }
) {
  try {
    const session = await requireAnyScope(["expenses.submit", "invoices.write"]);

    const expCheck = await db.query(
      `SELECT status FROM fin.expenses WHERE id = $1`,
      [expenseId]
    );

    if (expCheck.rows.length === 0) {
      return { success: false, error: "Expense not found" };
    }

    if (expCheck.rows[0].status === "reimbursed") {
      return { success: false, error: "Cannot edit an already reimbursed expense" };
    }

    const amountMinor = data.amount ? Math.round(data.amount * 100) : null;

    await db.query(
      `UPDATE fin.expenses
       SET amount_minor = coalesce($1, amount_minor),
           paid_to = coalesce($2, paid_to),
           expense_date = coalesce($3::date, expense_date),
           notes = $4,
           updated_at = now()
       WHERE id = $5`,
      [amountMinor, data.paidTo || null, data.expenseDate || null, data.notes || null, expenseId]
    );

    await db.query(
      `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
       VALUES ($1, 'UPDATE_EXPENSE', 'fin.expenses', $2, $3::jsonb)`,
      [session.userId, expenseId, JSON.stringify(data)]
    );

    revalidatePath("/finance");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update expense:", err);
    return { success: false, error: err.message || "Failed to update expense" };
  }
}

export async function deleteExpenseAction(expenseId: string) {
  try {
    const session = await requireAnyScope(["expenses.submit", "invoices.write"]);

    const expRes = await db.query(
      `SELECT expense_no, status FROM fin.expenses WHERE id = $1`,
      [expenseId]
    );

    if (expRes.rows.length === 0) {
      return { success: false, error: "Expense not found" };
    }

    const expense = expRes.rows[0];

    if (expense.status === "reimbursed") {
      return { success: false, error: "Cannot delete a reimbursed expense" };
    }

    await db.query(`DELETE FROM fin.expenses WHERE id = $1`, [expenseId]);

    await db.query(
      `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, before)
       VALUES ($1, 'DELETE_EXPENSE', 'fin.expenses', $2, $3::jsonb)`,
      [session.userId, expenseId, JSON.stringify({ expense_no: expense.expense_no })]
    );

    revalidatePath("/finance");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to delete expense:", err);
    return { success: false, error: err.message || "Failed to delete expense" };
  }
}

export async function voidPaymentAction(paymentId: string) {
  try {
    const session = await requireAnyScope(["payments.write", "invoices.write"]);

    const payRes = await db.query(
      `SELECT payment_no, status FROM fin.payments WHERE id = $1`,
      [paymentId]
    );

    if (payRes.rows.length === 0) {
      return { success: false, error: "Payment not found" };
    }

    const payment = payRes.rows[0];

    const matchCheck = await db.query(
      `SELECT count(*) as count FROM fin.payment_matches WHERE payment_id = $1`,
      [paymentId]
    );
    const hasMatches = Number(matchCheck.rows[0]?.count || 0) > 0;

    if (hasMatches) {
      await db.query(
        `UPDATE fin.payments SET status = 'void', updated_at = now() WHERE id = $1`,
        [paymentId]
      );

      await db.query(
        `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
         VALUES ($1, 'VOID_PAYMENT', 'fin.payments', $2, '{"status": "void"}'::jsonb)`,
        [session.userId, paymentId]
      );
      revalidatePath("/finance");
      return { success: true, voided: true };
    } else {
      await db.query(`DELETE FROM fin.payments WHERE id = $1`, [paymentId]);

      await db.query(
        `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, before)
         VALUES ($1, 'DELETE_PAYMENT', 'fin.payments', $2, $3::jsonb)`,
        [session.userId, paymentId, JSON.stringify({ payment_no: payment.payment_no })]
      );
      revalidatePath("/finance");
      return { success: true, voided: false };
    }
  } catch (err: any) {
    console.error("Failed to void payment:", err);
    return { success: false, error: err.message || "Failed to void payment" };
  }
}

