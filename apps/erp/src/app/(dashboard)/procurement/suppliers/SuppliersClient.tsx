"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Building2,
  Mail,
  Phone,
  Globe2,
  CheckCircle2,
  AlertCircle,
  Truck,
  PackageCheck,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { createSupplierAction, updateSupplierAction, deleteSupplierAction } from "./actions";

export interface SupplierRow {
  id: string;
  supplier_no: string;
  name: string;
  country: string | null;
  kind: string;
  tin: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  currency: string | null;
  payment_terms: string | null;
  lead_time_days: number | null;
  status: string;
  po_count?: number;
}

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  active: { label: "Active", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  pending_verification: { label: "Pending Verification", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  on_hold: { label: "On Hold", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  blocked: { label: "Blocked", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};

const KIND_LABELS: Record<string, string> = {
  manufacturer: "Manufacturer",
  distributor: "Distributor",
  local_dealer: "Local Dealer",
  agent: "Procurement Agent",
};

export function SuppliersClient({ initialSuppliers }: { initialSuppliers: SupplierRow[] }) {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>(initialSuppliers);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [country, setCountry] = useState("GH");
  const [kind, setKind] = useState("distributor");
  const [tin, setTin] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [paymentTerms, setPaymentTerms] = useState("30_days");
  const [leadTimeDays, setLeadTimeDays] = useState("14");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.supplier_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.contact_name && s.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.tin && s.tin.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesKind = kindFilter === "all" || s.kind === kindFilter;

    return matchesSearch && matchesStatus && matchesKind;
  });

  const activeCount = suppliers.filter((s) => s.status === "active").length;
  const verifiedTinCount = suppliers.filter((s) => Boolean(s.tin)).length;
  const uniqueCountries = Array.from(new Set(suppliers.map((s) => s.country).filter(Boolean))).length;

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("country", country);
      formData.set("kind", kind);
      formData.set("tin", tin);
      formData.set("contactName", contactName);
      formData.set("email", email);
      formData.set("phone", phone);
      formData.set("address", address);
      formData.set("currency", currency);
      formData.set("paymentTerms", paymentTerms);
      formData.set("leadTimeDays", leadTimeDays);
      formData.set("status", status);
      formData.set("notes", notes);

      const res = await createSupplierAction(formData);
      if (res?.success) {
        setFormSuccess("Supplier created successfully.");
        setSuppliers((prev) => [
          {
            id: res.supplierId,
            supplier_no: `SUP-${new Date().getFullYear()}-NEW`,
            name,
            country,
            kind,
            tin,
            contact_name: contactName,
            email,
            phone,
            currency,
            payment_terms: paymentTerms,
            lead_time_days: parseInt(leadTimeDays, 10),
            status,
            po_count: 0,
          },
          ...prev,
        ]);
        setName("");
        setTin("");
        setContactName("");
        setEmail("");
        setPhone("");
        setAddress("");
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess(null);
        }, 1200);
      } else {
        setFormError(res?.error || "Failed to create supplier");
      }
    });
  };

  // Edit supplier state
  const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "on_hold" | "blocked" | "pending_verification">("active");
  const [editPaymentTerms, setEditPaymentTerms] = useState("30_days");
  const [editCurrency, setEditCurrency] = useState("GHS");
  const [editError, setEditError] = useState<string | null>(null);

  // Delete state
  const [deleteConfirmSupplier, setDeleteConfirmSupplier] = useState<SupplierRow | null>(null);

  const handleOpenEdit = (s: SupplierRow) => {
    setEditingSupplier(s);
    setEditName(s.name);
    setEditContactName(s.contact_name || "");
    setEditEmail(s.email || "");
    setEditPhone(s.phone || "");
    setEditStatus((s.status as any) || "active");
    setEditPaymentTerms(s.payment_terms || "30_days");
    setEditCurrency(s.currency || "GHS");
    setEditError(null);
  };

  const handleUpdateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    setEditError(null);

    startTransition(async () => {
      const res = await updateSupplierAction(editingSupplier.id, {
        name: editName,
        contactName: editContactName || null,
        email: editEmail || null,
        phone: editPhone || null,
        status: editStatus,
        paymentTerms: editPaymentTerms,
        currency: editCurrency,
      });

      if (res.success) {
        setSuppliers((prev) =>
          prev.map((s) =>
            s.id === editingSupplier.id
              ? {
                  ...s,
                  name: editName,
                  contact_name: editContactName || null,
                  email: editEmail || null,
                  phone: editPhone || null,
                  status: editStatus,
                  payment_terms: editPaymentTerms,
                  currency: editCurrency,
                }
              : s
          )
        );
        setEditingSupplier(null);
      } else {
        setEditError(res.error || "Failed to update supplier");
      }
    });
  };

  const handleDeleteSupplier = (id: string) => {
    startTransition(async () => {
      const res = await deleteSupplierAction(id);
      if (res.success) {
        if (res.blocked) {
          setSuppliers((prev) =>
            prev.map((s) => (s.id === id ? { ...s, status: "blocked" } : s))
          );
        } else {
          setSuppliers((prev) => prev.filter((s) => s.id !== id));
        }
        setDeleteConfirmSupplier(null);
      } else {
        alert(res.error || "Failed to delete supplier");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Suppliers Directory</h1>
          <p className="text-sm text-slate-500">
            Manage approved vendor profiles, payment terms, and procurement partnerships.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded flex items-center gap-2 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Procurement Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <Link
          href="/procurement"
          className="pb-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors"
        >
          <Truck className="w-4 h-4 text-slate-400" />
          Purchase Orders
        </Link>
        <Link
          href="/procurement/grn"
          className="pb-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors"
        >
          <PackageCheck className="w-4 h-4 text-slate-400" />
          Goods Receipts
        </Link>
        <Link
          href="/procurement/suppliers"
          className="pb-2.5 border-b-2 border-navy-900 text-navy-900 flex items-center gap-2"
        >
          <Building2 className="w-4 h-4 text-navy-900" />
          Suppliers Directory
        </Link>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Total Suppliers</p>
          <p className="text-2xl font-bold text-ink mt-1">{suppliers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Active Partners</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Tax Verified (TIN)</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{verifiedTinCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Countries Represented</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{uniqueCountries || 1}</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by supplier name, number, TIN, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded border border-slate-300 bg-white focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="on_hold">On Hold</option>
              <option value="blocked">Blocked</option>
            </select>

            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none"
            >
              <option value="all">All Kinds</option>
              <option value="manufacturer">Manufacturers</option>
              <option value="distributor">Distributors</option>
              <option value="local_dealer">Local Dealers</option>
              <option value="agent">Agents</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Supplier No</th>
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Country / Origin</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Payment Terms</th>
                <th className="px-4 py-3">Lead Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No suppliers matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => {
                  const badge = STATUS_BADGES[s.status] || STATUS_BADGES.active;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono text-navy-800 font-medium">
                        {s.supplier_no}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">
                        <div>{s.name}</div>
                        {s.contact_name && (
                          <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                            Attn: {s.contact_name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {KIND_LABELS[s.kind] || s.kind}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {s.country || "GH"}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {s.currency || "GHS"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 capitalize">
                        {(s.payment_terms || "30_days").replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.lead_time_days ? `${s.lead_time_days} days` : "–"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.bg} ${badge.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                            title="Edit Supplier"
                          >
                            <Pencil className="w-3 h-3 text-slate-600" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmSupplier(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                            title="Delete Supplier"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-base font-semibold text-ink">Register New Supplier</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-6 space-y-4">
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
                <label className="text-xs font-semibold text-slate-700">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acer West Africa Dist. Ltd."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Category *</label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  >
                    <option value="distributor">Distributor</option>
                    <option value="manufacturer">Manufacturer</option>
                    <option value="local_dealer">Local Dealer</option>
                    <option value="agent">Procurement Agent</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Country Code *</label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="GH, US, CN, TW"
                    value={country}
                    onChange={(e) => setCountry(e.target.value.toUpperCase())}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs uppercase focus:border-navy-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Currency *</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  >
                    <option value="GHS">GHS (Ghana Cedi)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="CNY">CNY (Chinese Yuan)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  >
                    <option value="immediate">Immediate / Advance</option>
                    <option value="15_days">Net 15 Days</option>
                    <option value="30_days">Net 30 Days</option>
                    <option value="60_days">Net 60 Days</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Sales Representative"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tax TIN Number</label>
                  <input
                    type="text"
                    placeholder="e.g. C0001234567"
                    value={tin}
                    onChange={(e) => setTin(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    placeholder="sales@supplier.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Phone</label>
                  <input
                    type="tel"
                    placeholder="+233 24 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 px-3 text-xs text-slate-600 hover:text-ink font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-8 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Register Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-base font-semibold text-ink">Edit Supplier Details</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{editingSupplier.supplier_no}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="text-slate-400 hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSupplier} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {editError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Company Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full h-8 px-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="pending_verification">Pending Verification</option>
                    <option value="on_hold">On Hold</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Currency *</label>
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  >
                    <option value="GHS">GHS (Ghana Cedi)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="CNY">CNY (Chinese Yuan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Payment Terms</label>
                  <select
                    value={editPaymentTerms}
                    onChange={(e) => setEditPaymentTerms(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  >
                    <option value="immediate">Immediate / Advance</option>
                    <option value="15_days">Net 15 Days</option>
                    <option value="30_days">Net 30 Days</option>
                    <option value="60_days">Net 60 Days</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Contact Person</label>
                  <input
                    type="text"
                    value={editContactName}
                    onChange={(e) => setEditContactName(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Phone</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="h-8 px-3 text-xs text-slate-600 hover:text-ink font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-8 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded disabled:opacity-50"
                >
                  {isPending ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Block Confirmation Modal */}
      {deleteConfirmSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-ink">Delete Supplier</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to remove <span className="font-semibold text-slate-700">{deleteConfirmSupplier.name}</span> ({deleteConfirmSupplier.supplier_no})?
                </p>
                <p className="text-[11px] text-slate-400">
                  If this vendor has historical purchase orders, they will be archived/blocked instead of permanently deleted to preserve audit trails.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmSupplier(null)}
                className="h-8 px-3 text-xs text-slate-600 hover:text-ink font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDeleteSupplier(deleteConfirmSupplier.id)}
                className="h-8 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded disabled:opacity-50"
              >
                {isPending ? "Processing..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
