import { getSession } from "@/lib/session";
import { Package, ShoppingCart, Activity } from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Overview</h1>
        <p className="text-sm text-slate-500">Welcome back, {session?.fullName}. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mock KPI Cards */}
        <div className="bg-white p-6 rounded-[8px] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-navy-50 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-navy-800" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Items</p>
            <p className="text-2xl font-semibold text-ink">1,248</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[8px] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gold-50 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-6 h-6 text-gold-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Approvals</p>
            <p className="text-2xl font-semibold text-ink">24</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[8px] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-pass-bg flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6 text-pass" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">System Status</p>
            <p className="text-2xl font-semibold text-ink">Healthy</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-ink">Recent Activity</h2>
          </div>
          <div className="flex-1 p-6 flex items-center justify-center text-sm text-slate-500 bg-slate-50/50">
            Activity feed placeholder
          </div>
        </div>
        <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-ink">Quick Actions</h2>
          </div>
          <div className="flex-1 p-6 flex items-center justify-center text-sm text-slate-500 bg-slate-50/50">
            Actions placeholder based on roles
          </div>
        </div>
      </div>
    </div>
  );
}
