"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  Briefcase,
  Ship,
  Boxes,
  Landmark,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  UserCheck,
  AlertCircle,
  Truck,
  Layers,
  Activity,
  PlusCircle,
  Eye,
} from "lucide-react";

export interface DashboardMetrics {
  superAdmin: {
    pendingInvitations: number;
    suspendedUsers: number;
    permissionChanges: number;
    failedJobs: number;
    securityAlerts: number;
  };
  management: {
    approvalsWaiting: number;
    shipmentsDelayed: number;
    belowReorder: number;
    unitsByStage: number;
    ordersPending: number;
  };
  procurement: {
    openPOs: number;
    activeShipments: number;
    heldAtCustoms: number;
    chargesAwaitingActuals: number;
  };
  inventory: {
    receiptsExpected: number;
    reorderSuggestions: number;
    ordersReady: number;
    ordersAwaitingMaterials: number;
  };
  finance: {
    invoicesToIssue: number;
    unallocatedPayments: number;
    openTickets: number;
    pendingExpenses: number;
  };
  technician: {
    assignedUnits: number;
    blockedUnits: number;
    repairsAssigned: number;
  };
  qc: {
    unitsAwaitingInspection: number;
    incomingInspections: number;
    reworkReady: number;
  };
}

interface AuditItem {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  actor_name: string;
}

interface DashboardClientProps {
  initialRole: string;
  fullName: string;
  metrics: DashboardMetrics;
  recentActivities: AuditItem[];
}

export function DashboardClient({
  initialRole,
  fullName,
  metrics,
  recentActivities,
}: DashboardClientProps) {
  // Normalize role
  const normalizeRole = (r: string) => {
    if (r.includes("admin")) return "super_admin";
    if (r.includes("management")) return "management";
    if (r.includes("procurement") || r.includes("import")) return "procurement_imports";
    if (r.includes("inventory") || r.includes("sales")) return "inventory_sales";
    if (r.includes("finance") || r.includes("service")) return "finance_service";
    if (r.includes("tech") || r.includes("assembly")) return "assembly_technician";
    if (r.includes("qc") || r.includes("quality")) return "qc_inspector";
    return "management";
  };

  const [activeRole, setActiveRole] = useState<string>(normalizeRole(initialRole));

  const roles = [
    { id: "super_admin", label: "Super Admin", icon: Shield, badge: "System" },
    { id: "management", label: "Management", icon: Briefcase, badge: "Operations" },
    { id: "procurement_imports", label: "Procurement & Imports", icon: Ship, badge: "Supply" },
    { id: "inventory_sales", label: "Inventory & Sales", icon: Boxes, badge: "Warehouse" },
    { id: "finance_service", label: "Finance & Service", icon: Landmark, badge: "Accounts" },
    { id: "assembly_technician", label: "Assembly Tech", icon: Wrench, badge: "Production" },
    { id: "qc_inspector", label: "QC Inspector", icon: CheckCircle2, badge: "Quality" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink tracking-tight">Operations Overview</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-navy-50 text-navy-800 border border-navy-100 uppercase">
              Section 02 Workflow
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-medium text-slate-700">{fullName}</span>. Live landing console per UPSA operational role matrix.
          </p>
        </div>

        {/* Global Quick Action Links */}
        <div className="flex items-center gap-2">
          <Link
            href="/approvals"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Approvals</span>
            {metrics.management.approvalsWaiting > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                {metrics.management.approvalsWaiting}
              </span>
            )}
          </Link>
          <Link
            href="/orders/new"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded bg-navy-800 hover:bg-navy-900 text-white transition-colors shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Order</span>
          </Link>
        </div>
      </div>

      {/* Role Switcher Matrix */}
      <div className="bg-slate-100 p-1.5 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between px-3 py-1.5 mb-1 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            ROLE LANDING PERSPECTIVE SWITCHER
          </span>
          <span className="text-[11px] text-slate-400">Section 02 Workflow Verified</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
          {roles.map((r) => {
            const Icon = r.icon;
            const isActive = activeRole === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setActiveRole(r.id)}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-md text-center transition-all ${
                  isActive
                    ? "bg-white text-navy-900 shadow-sm border border-slate-200 font-semibold"
                    : "text-slate-600 hover:bg-slate-200/60 font-medium"
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${isActive ? "text-navy-800" : "text-slate-500"}`} />
                <span className="text-xs truncate w-full">{r.label}</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider">{r.badge}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Role-Specific Metric Widgets Grid (Section 02 Standard) */}
      <div>
        {activeRole === "super_admin" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link
              href="/admin/users?status=invited"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Pending Invitations</span>
                <UserCheck className="w-4 h-4 text-slate-400 group-hover:text-navy-800" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.superAdmin.pendingInvitations}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>/admin/users?status=invited</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/admin/users?status=suspended"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Suspended Users</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.superAdmin.suspendedUsers}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>/admin/users?status=suspended</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/admin/audit?entity=core.profiles"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Scope & Role Changes</span>
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.superAdmin.permissionChanges}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Last 7 days in core.profiles</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/admin/audit"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Backup & Health</span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-emerald-700 mt-3">Healthy (26h window)</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Audit trail active</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/admin/audit?action=security"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Security Alerts</span>
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.superAdmin.securityAlerts}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Lockouts & resets</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>
          </div>
        )}

        {activeRole === "management" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link
              href="/approvals"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Approvals Waiting</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.management.approvalsWaiting}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Pending decision</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/imports/shipments?filter=delayed"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Shipments Delayed</span>
                <Ship className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.management.shipmentsDelayed}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>ETA slippage &gt; 3d</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/orders?status=pending_approval"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Orders Awaiting Approval</span>
                <FileText className="w-4 h-4 text-slate-400 group-hover:text-navy-800" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.management.ordersPending}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Internal sales orders</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/production/board"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Units by Stage</span>
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.management.unitsByStage}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Building, test & QC</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/reports"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Financial & Margins</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-emerald-700 mt-3">Margin Trends</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Reports & exception KPIs</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>
          </div>
        )}

        {activeRole === "procurement_imports" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/procurement"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Open Purchase Orders</span>
                <Truck className="w-4 h-4 text-navy-800" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.procurement.openPOs}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Active & confirmed POs</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/imports/shipments?view=board"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Shipments in Pipeline</span>
                <Ship className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.procurement.activeShipments}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Kanban stage board</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/imports/shipments?status=held"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Held at Customs</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.procurement.heldAtCustoms}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Customs query or hold</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/imports/shipments?filter=estimated_charges"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Charges Awaiting Actuals</span>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.procurement.chargesAwaitingActuals}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Pre-landed cost matching</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>
          </div>
        )}

        {activeRole === "inventory_sales" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/procurement/grn"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Receipts Expected / Draft</span>
                <Boxes className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.inventory.receiptsExpected}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Goods receiving screen</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/orders"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Orders Approved & Ready</span>
                <FileText className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.inventory.ordersReady}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Ready to allocate & dispatch</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/production?status=awaiting_materials"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Awaiting Materials</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.inventory.ordersAwaitingMaterials}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Production shortage alert</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/inventory/transfers"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Internal Transfers</span>
                <Truck className="w-4 h-4 text-navy-800" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mt-3">Locations Active</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Warehouse movement</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>
          </div>
        )}

        {activeRole === "finance_service" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/finance"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Invoices to Issue / Match</span>
                <Landmark className="w-4 h-4 text-navy-800" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.finance.invoicesToIssue}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Customer invoices & claims</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/finance"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Pending Reimbursements</span>
                <FileText className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.finance.pendingExpenses}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Staff claims awaiting review</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/service"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Active Service Tickets</span>
                <Wrench className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.finance.openTickets}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Warranty & billable repairs</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/finance"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Period Close Checklist</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-emerald-700 mt-3">Monthly Audit Ready</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Fiscal controls</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>
          </div>
        )}

        {activeRole === "assembly_technician" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/production/queue"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>My Production Queue</span>
                <Wrench className="w-4 h-4 text-navy-800" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.technician.assignedUnits}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Units in building & test stages</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/production/queue?filter=blocked"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Rework & Blocked Units</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.technician.blockedUnits}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>QC return or component failure</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/service?assigned=me"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Repairs Assigned to Me</span>
                <Layers className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.technician.repairsAssigned}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Bench diagnosis & part replacement</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>
          </div>
        )}

        {activeRole === "qc_inspector" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/quality/inspections?tab=units"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Units Awaiting Inspection</span>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.qc.unitsAwaitingInspection}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Post-burnin QC hold queue</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/quality/inspections?tab=incoming"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Incoming Inspections</span>
                <Boxes className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.qc.incomingInspections}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Receiving line quarantine</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            <Link
              href="/quality/rework?status=done"
              className="bg-white p-5 rounded-lg border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Rework Ready for Retest</span>
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-ink mt-2">{metrics.qc.reworkReady}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Post-repair validation</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>
          </div>
        )}
      </div>

      {/* Activity and Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-sm font-semibold text-ink">Recent Audit Trail</h2>
            <Link href="/admin/audit" className="text-xs text-gold-600 hover:text-gold-700 font-medium">
              View all &rarr;
            </Link>
          </div>
          <div className="p-6 flex-1">
            {recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-44 text-slate-400 text-sm">
                <Clock className="w-7 h-7 mb-1.5 opacity-40" />
                No audit events logged yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentActivities.map((act) => (
                  <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {act.action}
                        </span>
                        <span className="font-medium text-ink">{act.entity_type}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5">By {act.actor_name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-sm font-semibold text-ink">Core Workflow Shortcuts</h2>
            <span className="text-xs text-slate-400">Standard Navigation</span>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/imports/shipments"
              className="p-3.5 rounded-lg border border-slate-200 hover:border-navy-800 hover:bg-slate-50 transition-all flex flex-col gap-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink text-sm">Shipments & Customs</span>
                <Ship className="w-4 h-4 text-slate-400 group-hover:text-navy-800" />
              </div>
              <p className="text-xs text-slate-500">Kanban tracker & landed cost</p>
            </Link>

            <Link
              href="/production/board"
              className="p-3.5 rounded-lg border border-slate-200 hover:border-navy-800 hover:bg-slate-50 transition-all flex flex-col gap-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink text-sm">Live Production Board</span>
                <Layers className="w-4 h-4 text-slate-400 group-hover:text-navy-800" />
              </div>
              <p className="text-xs text-slate-500">WIP assembly stages & test queue</p>
            </Link>

            <Link
              href="/inventory/ledger"
              className="p-3.5 rounded-lg border border-slate-200 hover:border-navy-800 hover:bg-slate-50 transition-all flex flex-col gap-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink text-sm">Stock Ledger (Append-only)</span>
                <Boxes className="w-4 h-4 text-slate-400 group-hover:text-navy-800" />
              </div>
              <p className="text-xs text-slate-500">Immutable inventory audit trail</p>
            </Link>

            <Link
              href="/quality/inspections"
              className="p-3.5 rounded-lg border border-slate-200 hover:border-navy-800 hover:bg-slate-50 transition-all flex flex-col gap-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink text-sm">Quality Inspections</span>
                <CheckCircle2 className="w-4 h-4 text-slate-400 group-hover:text-navy-800" />
              </div>
              <p className="text-xs text-slate-500">Finished computer QC & serial release</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
