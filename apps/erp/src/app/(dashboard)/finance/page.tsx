import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import FinanceClient, { InvoiceRow, PaymentRow, ExpenseRow } from "./FinanceClient";

export default async function FinancePage() {
  await requireAnyScope(["invoices.write", "payments.write", "gl.read", "expenses.submit", "budgets.write"]);

  const [invoicesRes, paymentsRes, expensesRes, accountsRes, categoriesRes] = await Promise.all([
    db.query<InvoiceRow>(`
      SELECT 
        i.id, 
        i.invoice_no, 
        i.status, 
        i.total_minor, 
        i.currency, 
        i.due_date,
        coalesce(a.name, 'Unknown Account') as customer_name
      FROM fin.invoices i
      LEFT JOIN core.customer_accounts a ON a.id = i.account_id
      ORDER BY i.invoice_no DESC
      LIMIT 100
    `),
    db.query<PaymentRow>(`
      SELECT 
        p.id, 
        p.payment_no, 
        p.direction, 
        p.method, 
        p.amount_minor, 
        p.currency, 
        p.status,
        p.reference, 
        p.paid_on,
        coalesce(a.name, s.name, 'General') as party_name
      FROM fin.payments p
      LEFT JOIN core.customer_accounts a ON a.id = p.party_id AND p.party_type = 'customer'
      LEFT JOIN proc.suppliers s ON s.id = p.party_id AND p.party_type = 'supplier'
      ORDER BY p.paid_on DESC
      LIMIT 100
    `),
    db.query<ExpenseRow>(`
      SELECT 
        e.id, 
        e.expense_no, 
        e.amount_minor, 
        e.currency, 
        e.paid_to, 
        e.expense_date, 
        e.status, 
        e.notes,
        coalesce(c.name, 'Uncategorized') as category_name
      FROM fin.expenses e
      LEFT JOIN fin.expense_categories c ON c.id = e.category_id
      ORDER BY e.expense_date DESC
      LIMIT 100
    `),
    db.query<{ id: string; name: string }>(`
      SELECT id, name FROM core.customer_accounts ORDER BY name ASC
    `),
    db.query<{ id: string; name: string }>(`
      SELECT id, name FROM fin.expense_categories ORDER BY name ASC
    `)
  ]);

  return (
    <FinanceClient
      initialInvoices={invoicesRes.rows}
      initialPayments={paymentsRes.rows}
      initialExpenses={expensesRes.rows}
      accounts={accountsRes.rows}
      categories={categoriesRes.rows}
    />
  );
}
