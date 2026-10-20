"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Landmark,
  CreditCard,
  Receipt,
  FileText,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  recordPaymentAction,
  submitExpenseAction,
  updateExpenseAction,
  deleteExpenseAction,
  voidPaymentAction,
} from "./actions";

export interface InvoiceRow {
  id: string;
  invoice_no: string;
  status: string;
  total_minor: number;
  currency: string;
  due_date: string | null;
  customer_name: string;
}

export interface PaymentRow {
  id: string;
  payment_no: string;
  direction: string;
  method: string;
  amount_minor: number;
  currency: string;
  status: string;
  reference: string | null;
  paid_on: string;
  party_name?: string | null;
}

export interface ExpenseRow {
  id: string;
  expense_no: string;
  category_name: string;
  amount_minor: number;
  currency: string;
  paid_to: string | null;
  expense_date: string;
  status: string;
  notes: string | null;
}

interface AccountOption {
  id: string;
  name: string;
}

interface ExpenseCategoryOption {
  id: string;
  name: string;
}

interface FinanceClientProps {
  initialInvoices: InvoiceRow[];
  initialPayments: PaymentRow[];
  initialExpenses: ExpenseRow[];
  accounts: AccountOption[];
  categories: ExpenseCategoryOption[];
}

const INVOICE_STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "Draft", bg: "bg-slate-100", text: "text-slate-700" },
  issued: { label: "Issued", bg: "bg-blue-100", text: "text-blue-800" },
  part_paid: { label: "Partly Paid", bg: "bg-amber-100", text: "text-amber-800" },
  paid: { label: "Paid", bg: "bg-emerald-100", text: "text-emerald-800" },
  overdue: { label: "Overdue", bg: "bg-rose-100", text: "text-rose-800" },
  void: { label: "Void", bg: "bg-zinc-100", text: "text-zinc-600" },
};

const PAYMENT_STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  cleared: { label: "Cleared", bg: "bg-emerald-100", text: "text-emerald-800" },
  pending: { label: "Pending", bg: "bg-amber-100", text: "text-amber-800" },
  bounced: { label: "Bounced", bg: "bg-rose-100", text: "text-rose-800" },
  void: { label: "Void", bg: "bg-zinc-100", text: "text-zinc-600" },
};

const EXPENSE_STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "Draft", bg: "bg-slate-100", text: "text-slate-700" },
  pending_approval: { label: "Pending Approval", bg: "bg-amber-100", text: "text-amber-800" },
  approved: { label: "Approved", bg: "bg-blue-100", text: "text-blue-800" },
  paid: { label: "Reimbursed", bg: "bg-emerald-100", text: "text-emerald-800" },
  rejected: { label: "Rejected", bg: "bg-rose-100", text: "text-rose-800" },
};

export function FinanceClient({
  initialInvoices,
  initialPayments,
  initialExpenses,
  accounts,
  categories,
}: FinanceClientProps) {
  const [activeTab, setActiveTab] = useState<"invoices" | "payments" | "expenses">("invoices");

  const [invoices, setInvoices] = useState<InvoiceRow[]>(initialInvoices);
  const [payments, setPayments] = useState<PaymentRow[]>(initialPayments);
  const [expenses, setExpenses] = useState<ExpenseRow[]>(initialExpenses);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Payment Form state
  const [paymentDirection, setPaymentDirection] = useState("in");
  const [paymentPartyId, setPaymentPartyId] = useState(accounts[0]?.id || "");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentCurrency, setPaymentCurrency] = useState("GHS");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentPaidOn, setPaymentPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [paymentNotes, setPaymentNotes] = useState("");

  // Expense Form state
  const [expenseCategoryId, setExpenseCategoryId] = useState(categories[0]?.id || "");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCurrency, setExpenseCurrency] = useState("GHS");
  const [expensePaidTo, setExpensePaidTo] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseNotes, setExpenseNotes] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Metrics calculation
  const totalInvoicedMinor = invoices
    .filter((i) => i.status !== "void")
    .reduce((sum, i) => sum + (Number(i.total_minor) || 0), 0);

  const totalPaymentsCollectedMinor = payments
    .filter((p) => p.status === "cleared" && p.direction === "in")
    .reduce((sum, p) => sum + (Number(p.amount_minor) || 0), 0);

  const pendingExpensesMinor = expenses
    .filter((e) => e.status === "pending_approval")
    .reduce((sum, e) => sum + (Number(e.amount_minor) || 0), 0);

  // Filtered rows
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPayments = payments.filter((pay) => {
    const matchesSearch =
      pay.payment_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pay.reference && pay.reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pay.party_name && pay.party_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || pay.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      exp.expense_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.category_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.paid_to && exp.paid_to.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || exp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("direction", paymentDirection);
      formData.set("partyType", "account");
      formData.set("partyId", paymentPartyId);
      formData.set("method", paymentMethod);
      formData.set("amount", paymentAmount);
      formData.set("currency", paymentCurrency);
      formData.set("reference", paymentReference);
      formData.set("paidOn", paymentPaidOn);
      formData.set("notes", paymentNotes);

      const res = await recordPaymentAction(formData);
      if (res?.success) {
        setFormSuccess("Payment recorded successfully.");
        const selectedAcc = accounts.find((a) => a.id === paymentPartyId);
        setPayments((prev) => [
          {
            id: res.paymentId,
            payment_no: `PAY-${new Date().getFullYear()}-NEW`,
            direction: paymentDirection,
            method: paymentMethod,
            amount_minor: Math.round(parseFloat(paymentAmount) * 100),
            currency: paymentCurrency,
            status: "cleared",
            reference: paymentReference,
            paid_on: paymentPaidOn,
            party_name: selectedAcc?.name || "Client Account",
          },
          ...prev,
        ]);
        setPaymentAmount("");
        setPaymentReference("");
        setTimeout(() => {
          setIsPaymentModalOpen(false);
          setFormSuccess(null);
        }, 1200);
      } else {
        setFormError(res?.error || "Failed to record payment");
      }
    });
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("categoryId", expenseCategoryId);
      formData.set("amount", expenseAmount);
      formData.set("currency", expenseCurrency);
      formData.set("paidTo", expensePaidTo);
      formData.set("expenseDate", expenseDate);
      formData.set("notes", expenseNotes);

      const res = await submitExpenseAction(formData);
      if (res?.success) {
        setFormSuccess("Expense claim submitted for approval.");
        const selectedCat = categories.find((c) => c.id === expenseCategoryId);
        setExpenses((prev) => [
          {
            id: res.expenseId,
            expense_no: `EXP-${new Date().getFullYear()}-NEW`,
            category_name: selectedCat?.name || "Operations",
            amount_minor: Math.round(parseFloat(expenseAmount) * 100),
            currency: expenseCurrency,
            paid_to: expensePaidTo,
            expense_date: expenseDate,
            status: "pending_approval",
            notes: expenseNotes,
          },
          ...prev,
        ]);
        setExpenseAmount("");
        setExpensePaidTo("");
        setExpenseNotes("");
        setTimeout(() => {
          setIsExpenseModalOpen(false);
          setFormSuccess(null);
        }, 1200);
      } else {
        setFormError(res?.error || "Failed to submit expense");
      }
    });
  };

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [editExpAmount, setEditExpAmount] = useState("");
  const [editExpPaidTo, setEditExpPaidTo] = useState("");
  const [editExpDate, setEditExpDate] = useState("");
  const [editExpNotes, setEditExpNotes] = useState("");
  const [editExpError, setEditExpError] = useState<string | null>(null);

  const handleOpenEditExpense = (exp: ExpenseRow) => {
    setEditingExpense(exp);
    setEditExpAmount((exp.amount_minor / 100).toFixed(2));
    setEditExpPaidTo(exp.paid_to || "");
    setEditExpDate(String(exp.expense_date).slice(0, 10));
    setEditExpNotes(exp.notes || "");
    setEditExpError(null);
  };

  const handleUpdateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    setEditExpError(null);

    startTransition(async () => {
      const amt = parseFloat(editExpAmount);
      const res = await updateExpenseAction(editingExpense.id, {
        amount: isNaN(amt) ? undefined : amt,
        paidTo: editExpPaidTo || null,
        expenseDate: editExpDate,
        notes: editExpNotes || null,
      });

      if (res.success) {
        setExpenses((prev) =>
          prev.map((e) =>
            e.id === editingExpense.id
              ? {
                  ...e,
                  amount_minor: Math.round(amt * 100),
                  paid_to: editExpPaidTo || null,
                  expense_date: editExpDate,
                  notes: editExpNotes || null,
                }
              : e
          )
        );
        setEditingExpense(null);
      } else {
        setEditExpError(res.error || "Failed to update expense");
      }
    });
  };

  const handleDeleteExpense = (exp: ExpenseRow) => {
    if (!confirm(`Are you sure you want to delete expense claim ${exp.expense_no}?`)) return;

    startTransition(async () => {
      const res = await deleteExpenseAction(exp.id);
      if (res.success) {
        setExpenses((prev) => prev.filter((e) => e.id !== exp.id));
      } else {
        alert(res.error || "Failed to delete expense");
      }
    });
  };

  const handleVoidPayment = (pay: PaymentRow) => {
    const isCleared = pay.status === "cleared";
    const msg = isCleared
      ? `Void settlement payment ${pay.payment_no}? This will mark it as void in ledger.`
      : `Delete payment ${pay.payment_no}?`;
    if (!confirm(msg)) return;

    startTransition(async () => {
      const res = await voidPaymentAction(pay.id);
      if (res.success) {
        if (res.voided) {
          setPayments((prev) => prev.map((p) => (p.id === pay.id ? { ...p, status: "void" } : p)));
        } else {
          setPayments((prev) => prev.filter((p) => p.id !== pay.id));
        }
      } else {
        alert(res.error || "Failed to void payment");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Finance & Billing</h1>
          <p className="text-sm text-slate-500">
            Manage customer invoicing, payment settlements, and operational expenditure.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded flex items-center gap-2 transition-colors shadow-2xs"
          >
            <Receipt className="w-3.5 h-3.5 text-slate-500" />
            Claim Expense
          </button>
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded flex items-center gap-2 transition-colors shadow-2xs"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            Record Payment
          </button>
          <Link
            href="/finance/invoices/new"
            className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded flex items-center gap-2 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => {
            setActiveTab("invoices");
            setStatusFilter("all");
          }}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "invoices"
              ? "border-navy-900 text-navy-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          Customer Invoices ({invoices.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("payments");
            setStatusFilter("all");
          }}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "payments"
              ? "border-navy-900 text-navy-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payments Collected ({payments.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("expenses");
            setStatusFilter("all");
          }}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "expenses"
              ? "border-navy-900 text-navy-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Staff Expenses & Claims ({expenses.length})
        </button>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Total Invoiced</p>
          <p className="text-xl font-bold text-ink mt-1">
            GH₵ {(totalInvoicedMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Collected Cashflow</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            GH₵ {(totalPaymentsCollectedMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Pending Expense Claims</p>
          <p className="text-xl font-bold text-amber-600 mt-1">
            GH₵ {(pendingExpensesMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Active Accounts</p>
          <p className="text-xl font-bold text-navy-900 mt-1">{accounts.length}</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === "invoices"
                  ? "Search invoices by number or customer..."
                  : activeTab === "payments"
                  ? "Search payments by number, reference or party..."
                  : "Search expense claims by number, category or payee..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded border border-slate-300 bg-white focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none"
            >
              <option value="all">All Statuses</option>
              {activeTab === "invoices" && (
                <>
                  <option value="draft">Draft</option>
                  <option value="issued">Issued</option>
                  <option value="part_paid">Part Paid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </>
              )}
              {activeTab === "payments" && (
                <>
                  <option value="cleared">Cleared</option>
                  <option value="pending">Pending</option>
                  <option value="void">Void</option>
                </>
              )}
              {activeTab === "expenses" && (
                <>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Reimbursed</option>
                  <option value="rejected">Rejected</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Tab 1: Invoices Table */}
        {activeTab === "invoices" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Client Account</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const badge = INVOICE_STATUS_BADGES[inv.status] || INVOICE_STATUS_BADGES.draft;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono text-navy-800 font-medium">{inv.invoice_no}</td>
                        <td className="px-4 py-3 text-ink font-medium">{inv.customer_name}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-mono font-medium">
                          {inv.currency} {(inv.total_minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono">{inv.due_date ? String(inv.due_date).slice(0, 10) : "–"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Payments Table */}
        {activeTab === "payments" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Payment No</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Settled Amount</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Paid Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      No payments recorded yet. Click &quot;Record Payment&quot; to log incoming funds.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay) => {
                    const badge = PAYMENT_STATUS_BADGES[pay.status] || PAYMENT_STATUS_BADGES.cleared;
                    return (
                      <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono text-navy-800 font-medium">{pay.payment_no}</td>
                        <td className="px-4 py-3">
                          {pay.direction === "in" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" /> Inbound
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                              <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" /> Outbound
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 capitalize">{pay.method.replace("_", " ")}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-mono font-medium text-ink">
                          {pay.currency} {(pay.amount_minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">{pay.reference || "–"}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{String(pay.paid_on).slice(0, 10)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {pay.status !== "void" && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleVoidPayment(pay)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                              title="Void or Delete Payment"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              Void
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Expenses Table */}
        {activeTab === "expenses" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Expense No</th>
                  <th className="px-4 py-3">Expense Category</th>
                  <th className="px-4 py-3">Payee / Vendor</th>
                  <th className="px-4 py-3 text-right">Claim Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No expense claims submitted. Click &quot;Claim Expense&quot; to log reimbursement slips.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => {
                    const badge = EXPENSE_STATUS_BADGES[exp.status] || EXPENSE_STATUS_BADGES.pending_approval;
                    const canEdit = exp.status !== "paid";
                    return (
                      <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono text-navy-800 font-medium">{exp.expense_no}</td>
                        <td className="px-4 py-3 text-ink font-medium">{exp.category_name}</td>
                        <td className="px-4 py-3 text-slate-600">{exp.paid_to || "Staff Reimbursement"}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-mono font-medium text-ink">
                          {exp.currency} {(exp.amount_minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">{String(exp.expense_date).slice(0, 10)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {canEdit && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditExpense(exp)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                                title="Edit Expense"
                              >
                                <Pencil className="w-3 h-3 text-slate-600" />
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDeleteExpense(exp)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                                title="Delete Expense"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-base font-semibold text-ink">Record Settlement Payment</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {formSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Client / Customer Account *</label>
                <select
                  value={paymentPartyId}
                  onChange={(e) => setPaymentPartyId(e.target.value)}
                  className="w-full h-8 px-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Direction</label>
                  <select
                    value={paymentDirection}
                    onChange={(e) => setPaymentDirection(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  >
                    <option value="in">Inbound (Received)</option>
                    <option value="out">Outbound (Refund)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  >
                    <option value="bank_transfer">Bank Wire</option>
                    <option value="mobile_money">Mobile Money (MoMo)</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash Settlement</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Currency</label>
                  <select
                    value={paymentCurrency}
                    onChange={(e) => setPaymentCurrency(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  >
                    <option value="GHS">GHS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Reference / Slip No</label>
                  <input
                    type="text"
                    placeholder="e.g. TRF-839210"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Settled Date</label>
                  <input
                    type="date"
                    value={paymentPaidOn}
                    onChange={(e) => setPaymentPaidOn(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="h-8 px-3 text-xs text-slate-600 hover:text-ink font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-8 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded disabled:opacity-50"
                >
                  {isPending ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Submit Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-base font-semibold text-ink">Submit Expense Claim</h2>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {formSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Expense Category *</label>
                <select
                  value={expenseCategoryId}
                  onChange={(e) => setExpenseCategoryId(e.target.value)}
                  className="w-full h-8 px-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {categories.length === 0 && <option value="">Operational Supplies</option>}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Claim Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Currency</label>
                  <select
                    value={expenseCurrency}
                    onChange={(e) => setExpenseCurrency(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  >
                    <option value="GHS">GHS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Payee / Merchant</label>
                  <input
                    type="text"
                    placeholder="e.g. TotalEnergies Fuel"
                    value={expensePaidTo}
                    onChange={(e) => setExpensePaidTo(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Receipt Date</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Business Purpose / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Reason for expenditure..."
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="h-8 px-3 text-xs text-slate-600 hover:text-ink font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-8 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded disabled:opacity-50"
                >
                  {isPending ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Expense Claim Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-base font-semibold text-ink">Edit Expense Claim</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{editingExpense.expense_no}</p>
              </div>
              <button onClick={() => setEditingExpense(null)} className="text-slate-400 hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateExpense} className="p-6 space-y-4">
              {editExpError && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {editExpError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Claim Amount ({editingExpense.currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editExpAmount}
                  onChange={(e) => setEditExpAmount(e.target.value)}
                  className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Vendor / Payee</label>
                  <input
                    type="text"
                    value={editExpPaidTo}
                    onChange={(e) => setEditExpPaidTo(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Receipt Date</label>
                  <input
                    type="date"
                    value={editExpDate}
                    onChange={(e) => setEditExpDate(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Business Purpose / Notes</label>
                <textarea
                  rows={2}
                  value={editExpNotes}
                  onChange={(e) => setEditExpNotes(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="h-8 px-3 text-xs text-slate-600 hover:text-ink font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-8 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinanceClient;
