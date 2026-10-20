"use client";

import { useState, useTransition } from "react";
import { 
  Sliders, 
  Hash, 
  Percent, 
  TrendingUp, 
  MapPin, 
  Coins, 
  Settings as Cog, 
  Plus, 
  Edit3, 
  X, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { 
  addExchangeRateAction, 
  addTaxRateAction, 
  addLocationAction, 
  updateLocationAction, 
  updateDocSequenceAction, 
  saveGeneralSettingAction 
} from "./actions";

export interface DocSequenceRow {
  series: string;
  year: number;
  next_value: number;
}

export interface TaxRateRow {
  id: string;
  code: string;
  name: string;
  kind: "vat" | "levy" | "withholding";
  rate_pct: number;
  effective_from: string;
  effective_to: string | null;
  recoverable: boolean;
}

export interface ExchangeRateRow {
  id: string;
  currency_code: string;
  rate_to_base: number;
  effective_on: string;
  source: string;
}

export interface LocationRow {
  id: string;
  code: string;
  name: string;
  kind: "warehouse" | "assembly_wip" | "repair_bench" | "quarantine" | "in_transit" | "dispatch" | "showroom";
  active: boolean;
}

export interface CurrencyRow {
  code: string;
  name: string;
  minor_unit: number;
  active: boolean;
}

export interface SettingItem {
  key: string;
  value: any;
  description: string | null;
}

export function SettingsClient({
  sequences,
  taxRates,
  exchangeRates,
  locations,
  currencies,
  settings,
  canEdit,
  isFinance,
}: {
  sequences: DocSequenceRow[];
  taxRates: TaxRateRow[];
  exchangeRates: ExchangeRateRow[];
  locations: LocationRow[];
  currencies: CurrencyRow[];
  settings: SettingItem[];
  canEdit: boolean;
  isFinance: boolean;
}) {
  const [activeTab, setActiveTab] = useState<
    "numbering" | "taxes" | "exchange" | "locations" | "currencies" | "general"
  >("numbering");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [isSeqModalOpen, setIsSeqModalOpen] = useState(false);
  const [editSeq, setEditSeq] = useState<DocSequenceRow | null>(null);
  const [seqNextValue, setSeqNextValue] = useState("");

  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [taxCode, setTaxCode] = useState("");
  const [taxName, setTaxName] = useState("");
  const [taxKind, setTaxKind] = useState<"vat" | "levy" | "withholding">("vat");
  const [taxRatePct, setTaxRatePct] = useState("15.00");
  const [taxEffectiveFrom, setTaxEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [taxRecoverable, setTaxRecoverable] = useState(true);

  const [isFxModalOpen, setIsFxModalOpen] = useState(false);
  const [fxCurrency, setFxCurrency] = useState("USD");
  const [fxRate, setFxRate] = useState("16.25");
  const [fxEffectiveOn, setFxEffectiveOn] = useState(new Date().toISOString().slice(0, 10));
  const [fxSource, setFxSource] = useState("Bank of Ghana");

  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [locId, setLocId] = useState<string | null>(null);
  const [locCode, setLocCode] = useState("");
  const [locName, setLocName] = useState("");
  const [locKind, setLocKind] = useState<LocationRow["kind"]>("warehouse");
  const [locActive, setLocActive] = useState(true);

  const handleUpdateSequence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSeq) return;
    setError(null);
    startTransition(async () => {
      const res = await updateDocSequenceAction(
        editSeq.series,
        editSeq.year,
        parseInt(seqNextValue, 10) || 1
      );
      if (res.success) {
        setIsSeqModalOpen(false);
        setSuccessMsg(`Sequence ${editSeq.series}-${editSeq.year} updated.`);
      } else {
        setError(res.error || "Failed to update sequence");
      }
    });
  };

  const handleAddTaxRate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addTaxRateAction({
        code: taxCode,
        name: taxName,
        kind: taxKind,
        rate_pct: parseFloat(taxRatePct) || 0,
        effective_from: taxEffectiveFrom,
        recoverable: taxRecoverable,
      });
      if (res.success) {
        setIsTaxModalOpen(false);
        setTaxCode("");
        setTaxName("");
        setSuccessMsg("Tax rate successfully added.");
      } else {
        setError(res.error || "Failed to add tax rate");
      }
    });
  };

  const handleAddExchangeRate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addExchangeRateAction({
        currency_code: fxCurrency,
        rate_to_base: parseFloat(fxRate) || 1,
        effective_on: fxEffectiveOn,
        source: fxSource,
      });
      if (res.success) {
        setIsFxModalOpen(false);
        setSuccessMsg("Exchange rate successfully recorded.");
      } else {
        setError(res.error || "Failed to record exchange rate");
      }
    });
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      let res;
      if (locId) {
        res = await updateLocationAction(locId, {
          name: locName,
          kind: locKind,
          active: locActive,
        });
      } else {
        res = await addLocationAction({
          code: locCode,
          name: locName,
          kind: locKind,
        });
      }
      if (res.success) {
        setIsLocModalOpen(false);
        setSuccessMsg("Warehouse location saved.");
      } else {
        setError(res.error || "Failed to save location");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Feedback alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-semibold text-rose-600 hover:text-rose-900">
            Dismiss
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-semibold text-emerald-600 hover:text-emerald-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-2 pt-2 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("numbering")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "numbering"
              ? "border-[#f4b41a] text-[#0b192c]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Hash className="w-4 h-4" />
          <span>Numbering Sequences</span>
        </button>
        <button
          onClick={() => setActiveTab("taxes")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "taxes"
              ? "border-[#f4b41a] text-[#0b192c]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Tax Rates</span>
        </button>
        <button
          onClick={() => setActiveTab("exchange")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "exchange"
              ? "border-[#f4b41a] text-[#0b192c]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Exchange Rates</span>
        </button>
        <button
          onClick={() => setActiveTab("locations")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "locations"
              ? "border-[#f4b41a] text-[#0b192c]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Stock Locations</span>
        </button>
        <button
          onClick={() => setActiveTab("currencies")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "currencies"
              ? "border-[#f4b41a] text-[#0b192c]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Currencies</span>
        </button>
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "general"
              ? "border-[#f4b41a] text-[#0b192c]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Cog className="w-4 h-4" />
          <span>General Config</span>
        </button>
      </div>

      {/* Tab 1: Numbering Sequences */}
      {activeTab === "numbering" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Document Numbering Sequences</h2>
              <p className="text-xs text-slate-500">
                Gap-free sequential counter generators for procurement, shipments, adjustments, and orders.
              </p>
            </div>
          </div>
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Series Code</th>
                <th className="px-4 py-3">Calendar Year</th>
                <th className="px-4 py-3">Next Number Value</th>
                <th className="px-4 py-3">Sample Next Document No</th>
                {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sequences.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="px-4 py-8 text-center text-slate-400 text-xs">
                    No sequences initialized.
                  </td>
                </tr>
              ) : (
                sequences.map((s) => (
                  <tr key={`${s.series}-${s.year}`} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 text-xs">{s.series}</td>
                    <td className="px-4 py-3 text-xs">{s.year}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-700">
                      {s.next_value}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {s.series}-{s.year}-{String(s.next_value).padStart(6, "0")}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setEditSeq(s);
                            setSeqNextValue(s.next_value.toString());
                            setIsSeqModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded border border-slate-200"
                        >
                          Edit Counter
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Tax Rates */}
      {activeTab === "taxes" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Statutory Tax & Levy Rates</h2>
              <p className="text-xs text-slate-500">
                Dated tax rates (VAT, NHIL, GETFund, COVID Levy). Never hardcoded in business logic.
              </p>
            </div>
            {canEdit && (
              <button
                onClick={() => {
                  setTaxCode("");
                  setTaxName("");
                  setTaxKind("vat");
                  setTaxRatePct("15.00");
                  setTaxEffectiveFrom(new Date().toISOString().slice(0, 10));
                  setTaxRecoverable(true);
                  setIsTaxModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0b192c] text-[#f4b41a] rounded-lg hover:bg-[#1a2d47]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tax Rate</span>
              </button>
            )}
          </div>
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Code / Name</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Rate %</th>
                <th className="px-4 py-3">Effective Range</th>
                <th className="px-4 py-3">Recoverable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxRates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                    No tax rates recorded.
                  </td>
                </tr>
              ) : (
                taxRates.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-xs">
                      <div className="font-semibold text-slate-900 font-mono">{t.code}</div>
                      <div className="text-slate-500">{t.name}</div>
                    </td>
                    <td className="px-4 py-3 text-xs uppercase font-medium">{t.kind}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-900">{t.rate_pct}%</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {t.effective_from} {t.effective_to ? `to ${t.effective_to}` : "(Active)"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          t.recoverable ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {t.recoverable ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Exchange Rates */}
      {activeTab === "exchange" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Currency Exchange Rates (to GHS base)</h2>
              <p className="text-xs text-slate-500">
                Dated valuation rates applied to import shipments, POs, and landed-cost allocations.
              </p>
            </div>
            {(canEdit || isFinance) && (
              <button
                onClick={() => {
                  setFxCurrency("USD");
                  setFxRate("16.25");
                  setFxEffectiveOn(new Date().toISOString().slice(0, 10));
                  setFxSource("Bank of Ghana");
                  setIsFxModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0b192c] text-[#f4b41a] rounded-lg hover:bg-[#1a2d47]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Exchange Rate</span>
              </button>
            )}
          </div>
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Rate to Base (1 unit = GHS)</th>
                <th className="px-4 py-3">Effective Date</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exchangeRates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs">
                    No exchange rates recorded.
                  </td>
                </tr>
              ) : (
                exchangeRates.map((fx) => (
                  <tr key={fx.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-xs font-bold text-slate-900 font-mono">
                      {fx.currency_code}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono font-semibold text-indigo-700">
                      GHS {Number(fx.rate_to_base).toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fx.effective_on}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-700">{fx.source}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Locations */}
      {activeTab === "locations" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Warehouse & Facility Locations</h2>
              <p className="text-xs text-slate-500">
                Physical and logical locations for raw stock, assembly staging, QA holding, and dispatch.
              </p>
            </div>
            {canEdit && (
              <button
                onClick={() => {
                  setLocId(null);
                  setLocCode("");
                  setLocName("");
                  setLocKind("warehouse");
                  setLocActive(true);
                  setIsLocModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0b192c] text-[#f4b41a] rounded-lg hover:bg-[#1a2d47]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Location</span>
              </button>
            )}
          </div>
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Location Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Kind / Classification</th>
                <th className="px-4 py-3">Status</th>
                {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="px-4 py-8 text-center text-slate-400 text-xs">
                    No locations configured.
                  </td>
                </tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono font-bold text-xs text-slate-900">{loc.code}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-800">{loc.name}</td>
                    <td className="px-4 py-3 text-xs capitalize text-slate-600">
                      {loc.kind.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          loc.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {loc.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setLocId(loc.id);
                            setLocCode(loc.code);
                            setLocName(loc.name);
                            setLocKind(loc.kind);
                            setLocActive(loc.active);
                            setIsLocModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded"
                          title="Edit Location"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: Currencies */}
      {activeTab === "currencies" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">Supported Currencies</h2>
            <p className="text-xs text-slate-500">Operating currencies configured across the platform.</p>
          </div>
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Currency Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Minor Unit Scale</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currencies.map((c) => (
                <tr key={c.code} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono font-bold text-xs text-slate-900">{c.code}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-xs">{c.minor_unit} decimal places</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 uppercase">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 6: General Settings */}
      {activeTab === "general" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Platform Core Parameters</h2>
            <p className="text-xs text-slate-500">
              System-wide configurations stored in core.settings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
              <div className="text-xs font-semibold text-slate-700">Operating Unit</div>
              <div className="text-sm font-bold text-slate-900">
                UPSA Computer Assembly Unit (UAP)
              </div>
              <div className="text-xs text-slate-500">University of Professional Studies, Accra</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
              <div className="text-xs font-semibold text-slate-700">Base Currency</div>
              <div className="text-sm font-bold text-slate-900">Ghanaian Cedi (GHS)</div>
              <div className="text-xs text-slate-500">All ledger journals post in GHS</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
              <div className="text-xs font-semibold text-slate-700">Stock Adjustment Dual-Custody Limit</div>
              <div className="text-sm font-bold text-slate-900">GHS 500.00</div>
              <div className="text-xs text-slate-500">Section 07: Adjustments &gt; GHS 500 require Management approval</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
              <div className="text-xs font-semibold text-slate-700">Final Laptop Serial Format</div>
              <div className="text-sm font-bold text-slate-900 font-mono">UPSA-LAP-[year]-[000001]</div>
              <div className="text-xs text-slate-500">Generated automatically upon passing QC inspection</div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sequence Modal */}
      {isSeqModalOpen && editSeq && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateSequence}
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Edit Sequence Counter
              </h3>
              <button
                type="button"
                onClick={() => setIsSeqModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-2">
                Series <strong className="text-slate-900">{editSeq.series}</strong> for Year{" "}
                <strong className="text-slate-900">{editSeq.year}</strong>
              </div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Next Number Counter
              </label>
              <input
                type="number"
                min="1"
                required
                value={seqNextValue}
                onChange={(e) => setSeqNextValue(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b192c]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSeqModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 text-xs font-semibold bg-[#0b192c] text-[#f4b41a] rounded-lg hover:bg-[#1a2d47]"
              >
                Save Counter
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Tax Modal */}
      {isTaxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddTaxRate}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Add Statutory Tax Rate
              </h3>
              <button
                type="button"
                onClick={() => setIsTaxModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
                <input
                  type="text"
                  required
                  placeholder="VAT-STD"
                  value={taxCode}
                  onChange={(e) => setTaxCode(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Kind</label>
                <select
                  value={taxKind}
                  onChange={(e) => setTaxKind(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="vat">VAT</option>
                  <option value="levy">Levy (NHIL / GETFund / COVID)</option>
                  <option value="withholding">Withholding Tax</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Name / Description</label>
                <input
                  type="text"
                  required
                  placeholder="Standard VAT Rate"
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rate %</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={taxRatePct}
                  onChange={(e) => setTaxRatePct(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Effective From</label>
                <input
                  type="date"
                  required
                  value={taxEffectiveFrom}
                  onChange={(e) => setTaxEffectiveFrom(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsTaxModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 text-xs font-semibold bg-[#0b192c] text-[#f4b41a] rounded-lg hover:bg-[#1a2d47]"
              >
                Save Tax Rate
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add FX Modal */}
      {isFxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddExchangeRate}
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Record Exchange Rate
              </h3>
              <button
                type="button"
                onClick={() => setIsFxModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
              <select
                value={fxCurrency}
                onChange={(e) => setFxCurrency(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                {currencies
                  .filter((c) => c.code !== "GHS")
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rate to Base GHS (1 {fxCurrency} = GHS)
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={fxRate}
                onChange={(e) => setFxRate(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Effective Date</label>
              <input
                type="date"
                required
                value={fxEffectiveOn}
                onChange={(e) => setFxEffectiveOn(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Named Source</label>
              <input
                type="text"
                required
                placeholder="Bank of Ghana"
                value={fxSource}
                onChange={(e) => setFxSource(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFxModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 text-xs font-semibold bg-[#0b192c] text-[#f4b41a] rounded-lg hover:bg-[#1a2d47]"
              >
                Record Rate
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Location Modal */}
      {isLocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveLocation}
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {locId ? "Edit Location" : "Add Location"}
              </h3>
              <button
                type="button"
                onClick={() => setIsLocModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {!locId && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
                <input
                  type="text"
                  required
                  placeholder="WH-MAIN"
                  value={locCode}
                  onChange={(e) => setLocCode(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg uppercase"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
              <input
                type="text"
                required
                placeholder="Main Warehouse Rack A"
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kind</label>
              <select
                value={locKind}
                onChange={(e) => setLocKind(e.target.value as any)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="warehouse">Warehouse Storage</option>
                <option value="assembly_wip">Assembly WIP</option>
                <option value="repair_bench">Repair Bench</option>
                <option value="quarantine">Quarantine / QC Hold</option>
                <option value="in_transit">In Transit</option>
                <option value="dispatch">Dispatch Bay</option>
                <option value="showroom">Showroom</option>
              </select>
            </div>
            {locId && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="locActive"
                  checked={locActive}
                  onChange={(e) => setLocActive(e.target.checked)}
                  className="rounded text-[#0b192c]"
                />
                <label htmlFor="locActive" className="text-xs font-medium text-slate-700">
                  Location is Active
                </label>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsLocModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 text-xs font-semibold bg-[#0b192c] text-[#f4b41a] rounded-lg hover:bg-[#1a2d47]"
              >
                Save Location
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
