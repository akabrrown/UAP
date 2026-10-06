import { db } from "@/lib/db";
import { BarChart3, TrendingUp, Package, AlertCircle } from "lucide-react";

export default async function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Reports & Analytics</h1>
        <p className="text-sm text-slate-500">Key metrics, performance indicators, and business intelligence.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Cards - Static placeholders for the vertical slice */}
        <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500">Total Stock Value</h3>
            <div className="p-2 bg-navy-50 text-navy-800 rounded-full">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-ink">GHS 2.4M</div>
          <div className="text-xs text-success flex items-center gap-1 font-medium">
            +5.2% from last month
          </div>
        </div>

        <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500">Active Assembly Orders</h3>
            <div className="p-2 bg-gold-50 text-gold-700 rounded-full">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-ink">12</div>
          <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
            3 orders behind schedule
          </div>
        </div>

        <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500">Open Service Tickets</h3>
            <div className="p-2 bg-fail-bg text-fail rounded-full">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-ink">45</div>
          <div className="text-xs text-fail flex items-center gap-1 font-medium">
            8 tickets exceeding SLA
          </div>
        </div>

        <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500">Monthly Expenses</h3>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-full">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-ink">GHS 150K</div>
          <div className="text-xs text-success flex items-center gap-1 font-medium">
            Within 95% of budget
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm p-6 min-h-[300px] flex flex-col items-center justify-center text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-ink mb-1">Production Throughput</h3>
          <p className="text-sm text-slate-500 max-w-sm">Chart component would be rendered here, displaying units assembled vs. target over the last 30 days.</p>
        </div>
        <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm p-6 min-h-[300px] flex flex-col items-center justify-center text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-ink mb-1">Fault Distribution</h3>
          <p className="text-sm text-slate-500 max-w-sm">Chart component would be rendered here, displaying the most common warranty fault categories.</p>
        </div>
      </div>
    </div>
  );
}
