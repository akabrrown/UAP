"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { addTariff } from "./actions";

export interface TariffRow {
  id: string;
  hs_code: string;
  description?: string;
  duty_pct: string | number;
  vat_pct?: string | number;
  levies?: any;
  effective_from: string;
  effective_to?: string;
}

export function TariffsClient({ initialTariffs }: { initialTariffs: TariffRow[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [hsCode, setHsCode] = useState("");
  const [description, setDescription] = useState("");
  const [dutyPct, setDutyPct] = useState<number>(0);
  const [vatPct, setVatPct] = useState<number>(15.0);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);

  const filtered = initialTariffs.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.hs_code.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hsCode || !description) return;

    setIsSubmitting(true);
    const res = await addTariff({
      hsCode,
      description,
      dutyPct,
      vatPct,
      effectiveFrom,
    });

    if (res.success) {
      setShowAddModal(false);
      setHsCode("");
      setDescription("");
      setDutyPct(0);
      router.refresh();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink tracking-tight">Customs Tariffs & HS Codes</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-navy-50 text-navy-800 border border-navy-100">
              Section 06 Imports
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Harmonized System (HS) classifications, ECOWAS Common External Tariff (CET) rates, import VAT and statutory levies.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-navy-800 hover:bg-navy-900 text-white transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add HS Code</span>
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search HS Code or product description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-navy-800"
          />
        </div>
        <div className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> tariffs
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">HS Code</th>
              <th className="px-4 py-3">Classification Description</th>
              <th className="px-4 py-3 text-right">Import Duty (%)</th>
              <th className="px-4 py-3 text-right">Import VAT (%)</th>
              <th className="px-4 py-3">Effective Date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  No customs tariffs registered. Click &quot;Add HS Code&quot; to configure tariff schedules.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono font-bold text-navy-900">{t.hs_code}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{t.description}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {Number(t.duty_pct).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {Number(t.vat_pct || 15).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-slate-500">{t.effective_from}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                      Active
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add HS Code Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-navy-800" />
              Add Customs HS Code Tariff
            </h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  HS Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8471.30.00"
                  value={hsCode}
                  onChange={(e) => setHsCode(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Portable automatic data processing machines (Laptops)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Duty Rate (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={dutyPct}
                    onChange={(e) => setDutyPct(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    VAT Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={vatPct}
                    onChange={(e) => setVatPct(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Effective From
                </label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !hsCode || !description}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-navy-800 text-white hover:bg-navy-900 disabled:bg-slate-300"
                >
                  Save Tariff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
