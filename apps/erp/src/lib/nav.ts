import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Inbox,
  Truck,
  Boxes,
  Cpu,
  ShoppingCart,
  Landmark,
  Wrench,
  BarChart3,
  Shield,
  PackageSearch,
  History,
  Building2,
  Ship,
  ScrollText,
  CheckCircle2,
  Sliders,
  Scale,
  Barcode,
  Kanban,
  FileSpreadsheet,
} from "lucide-react";
import type { Scope } from "@uap/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  anyScope?: readonly Scope[];
}

export interface NavGroup {
  label: string;
  items: readonly NavItem[];
}

export const NAV: readonly NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Home", href: "/", icon: LayoutDashboard },
      {
        label: "Approvals",
        href: "/approvals",
        icon: Inbox,
        anyScope: [
          "procurement.approve",
          "orders.approve",
          "payments.approve",
          "expenses.approve",
          "service.approve",
          "inventory.adjust.approve",
          "bom.approve",
        ],
      },
    ],
  },
  {
    label: "Procurement & Imports",
    items: [
      { label: "Catalogue", href: "/catalogue", icon: PackageSearch, anyScope: ["catalog.read", "catalog.write"] },
      { label: "Purchase Orders", href: "/procurement", icon: Truck, anyScope: ["procurement.write", "procurement.approve"] },
      { label: "Suppliers", href: "/procurement/suppliers", icon: Building2, anyScope: ["suppliers.write", "procurement.write", "catalog.read"] },
      { label: "Shipments & Tracking", href: "/imports/shipments", icon: Ship, anyScope: ["imports.write", "procurement.write", "inventory.read"] },
      { label: "Landed Cost", href: "/imports/landed-cost", icon: Scale, anyScope: ["landedcost.post", "imports.write", "gl.read"] },
      { label: "Customs Tariffs", href: "/imports/tariffs", icon: FileSpreadsheet, anyScope: ["catalog.read", "catalog.write"] },
    ],
  },
  {
    label: "Inventory & Traceability",
    items: [
      { label: "Stock on Hand", href: "/inventory", icon: Boxes, anyScope: ["inventory.read", "inventory.receive", "inventory.issue"] },
      { label: "Goods Receipts (GRN)", href: "/procurement/grn", icon: PackageSearch, anyScope: ["inventory.receive", "procurement.write"] },
      { label: "Stock Ledger", href: "/inventory/ledger", icon: ScrollText, anyScope: ["inventory.read"] },
      { label: "Transfers", href: "/inventory/transfers", icon: Truck, anyScope: ["inventory.issue", "inventory.receive"] },
      { label: "Adjustments", href: "/inventory/adjustments", icon: Sliders, anyScope: ["inventory.adjust", "inventory.adjust.approve"] },
      { label: "Serials & Lots", href: "/inventory/serials", icon: Barcode, anyScope: ["inventory.read"] },
      { label: "Print Labels", href: "/inventory/labels", icon: Barcode, anyScope: ["inventory.read"] },
    ],
  },
  {
    label: "Production & Quality",
    items: [
      { label: "Production Board", href: "/production/board", icon: Kanban, anyScope: ["production.plan", "production.work", "qc.inspect"] },
      { label: "Assembly Orders", href: "/production", icon: Cpu, anyScope: ["production.plan", "production.work"] },
      { label: "Technician Queue", href: "/production/queue", icon: Wrench, anyScope: ["production.work"] },
      { label: "Quality Inspections", href: "/quality/inspections", icon: CheckCircle2, anyScope: ["qc.inspect"] },
      { label: "Rework Orders", href: "/quality/rework", icon: Sliders, anyScope: ["production.work", "qc.inspect"] },
      { label: "Defect Analytics", href: "/quality/defects", icon: BarChart3, anyScope: ["reports.read", "qc.inspect"] },
    ],
  },
  {
    label: "Sales & Dispatch",
    items: [
      { label: "Sales Orders", href: "/orders", icon: ShoppingCart, anyScope: ["orders.read", "orders.write", "dispatch.write"] },
    ],
  },
  {
    label: "Finance & Accounts",
    items: [
      { label: "Financial Ledger", href: "/finance", icon: Landmark, anyScope: ["invoices.write", "payments.write", "gl.read", "expenses.submit", "budgets.write"] },
    ],
  },
  {
    label: "Service & Warranty",
    items: [
      { label: "Service Tickets", href: "/service", icon: Wrench, anyScope: ["service.write", "service.work", "warranty.read"] },
      { label: "Warranties", href: "/service/warranties", icon: CheckCircle2, anyScope: ["warranty.read", "service.write"] },
    ],
  },
  {
    label: "Reports & KPIs",
    items: [
      { label: "Reports Hub", href: "/reports", icon: BarChart3, anyScope: ["reports.read"] },
    ],
  },
  {
    label: "System Administration",
    items: [
      { label: "Users & Staff", href: "/admin/users", icon: Shield, anyScope: ["users.manage"] },
      { label: "Approval Rules", href: "/admin/approval-rules", icon: Sliders, anyScope: ["settings.write", "roles.manage"] },
      { label: "System Settings", href: "/admin/settings", icon: Sliders, anyScope: ["settings.write"] },
      { label: "Audit Trail", href: "/admin/audit", icon: History, anyScope: ["audit.read", "users.manage"] },
    ],
  },
];

export function visibleNav(allowed: (item: NavItem) => boolean): NavGroup[] {
  return NAV.map((group) => ({ ...group, items: group.items.filter(allowed) })).filter((group) => group.items.length > 0);
}

