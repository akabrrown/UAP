import { Metadata } from "next";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { 
  SettingsClient, 
  DocSequenceRow, 
  TaxRateRow, 
  ExchangeRateRow, 
  LocationRow, 
  CurrencyRow, 
  SettingItem 
} from "./SettingsClient";

export const metadata: Metadata = {
  title: "System Settings | Administration | UAP",
};

export default async function AdminSettingsPage() {
  const session = await getSession();

  const [seqRes, taxRes, fxRes, locRes, currRes, settRes] = await Promise.all([
    db.query(`select series, year, next_value from core.doc_sequences order by series asc, year desc`),
    db.query(`select id, code, name, kind, rate_pct, effective_from, effective_to, recoverable from core.tax_rates order by effective_from desc, code asc`),
    db.query(`select id, currency_code, rate_to_base, effective_on, source from core.exchange_rates order by effective_on desc, currency_code asc limit 50`),
    db.query(`select id, code, name, kind, active from core.locations order by kind asc, code asc`),
    db.query(`select code, name, minor_unit, active from core.currencies order by code asc`),
    db.query(`select key, value, description from core.settings order by key asc`),
  ]);

  const sequences: DocSequenceRow[] = seqRes.rows.map((r) => ({
    series: r.series,
    year: r.year,
    next_value: Number(r.next_value),
  }));

  const taxRates: TaxRateRow[] = taxRes.rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    kind: r.kind,
    rate_pct: Number(r.rate_pct),
    effective_from: r.effective_from ? new Date(r.effective_from).toISOString().slice(0, 10) : "",
    effective_to: r.effective_to ? new Date(r.effective_to).toISOString().slice(0, 10) : null,
    recoverable: r.recoverable !== false,
  }));

  const exchangeRates: ExchangeRateRow[] = fxRes.rows.map((r) => ({
    id: r.id,
    currency_code: r.currency_code,
    rate_to_base: Number(r.rate_to_base),
    effective_on: r.effective_on ? new Date(r.effective_on).toISOString().slice(0, 10) : "",
    source: r.source,
  }));

  const locations: LocationRow[] = locRes.rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    kind: r.kind,
    active: r.active !== false,
  }));

  const currencies: CurrencyRow[] = currRes.rows.map((r) => ({
    code: r.code,
    name: r.name,
    minor_unit: r.minor_unit,
    active: r.active !== false,
  }));

  const settings: SettingItem[] = settRes.rows.map((r) => ({
    key: r.key,
    value: r.value,
    description: r.description,
  }));

  const userRole = session?.role || "assembly_technician";
  const canEdit = userRole === "super_admin" || userRole === "management";
  const isFinance = userRole === "finance_service";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#f4b41a] uppercase tracking-wider">
            System Administration
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Platform Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure numbering sequences, tax tables, exchange rates, stock locations, and currencies. (Section 13 Workflow)
          </p>
        </div>
      </div>

      <SettingsClient
        sequences={sequences}
        taxRates={taxRates}
        exchangeRates={exchangeRates}
        locations={locations}
        currencies={currencies}
        settings={settings}
        canEdit={canEdit}
        isFinance={isFinance}
      />
    </div>
  );
}
