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
      { label: "Approvals", href: "/approvals", icon: Inbox, anyScope: ["procurement.approve", "orders.approve", "payments.approve", "expenses.approve", "service.approve", "inventory.adjust.approve", "bom.approve"] },
    ],
  },
  {
    label: "Procurement and imports",
    items: [
      { label: "Catalogue", href: "/catalogue", icon: PackageSearch, anyScope: ["catalog.read", "catalog.write"] },
      { label: "Purchasing", href: "/procurement", icon: Truck, anyScope: ["procurement.write", "imports.write", "suppliers.write"] },
    ],
  },
  {
    label: "Inventory",
    items: [{ label: "Stock", href: "/inventory", icon: Boxes, anyScope: ["inventory.read", "inventory.receive", "inventory.issue"] }],
  },
  {
    label: "Production and quality",
    items: [{ label: "Assembly", href: "/production", icon: Cpu, anyScope: ["production.plan", "production.work", "tests.record", "qc.inspect"] }],
  },
  {
    label: "Sales and dispatch",
    items: [{ label: "Orders", href: "/orders", icon: ShoppingCart, anyScope: ["orders.read", "orders.write", "dispatch.write"] }],
  },
  {
    label: "Finance",
    items: [{ label: "Ledger", href: "/finance", icon: Landmark, anyScope: ["invoices.write", "payments.write", "gl.read", "expenses.submit", "budgets.write"] }],
  },
  {
    label: "Service",
    items: [{ label: "Tickets", href: "/service", icon: Wrench, anyScope: ["service.write", "service.work", "warranty.read"] }],
  },
  {
    label: "Reports",
    items: [{ label: "Reports", href: "/reports", icon: BarChart3, anyScope: ["reports.read"] }],
  },
  {
    label: "Admin",
    items: [{ label: "Administration", href: "/admin", icon: Shield, anyScope: ["users.manage", "roles.manage", "settings.write", "audit.read", "data.import", "api_clients.manage"] }],
  },
];

export function visibleNav(allowed: (item: NavItem) => boolean): NavGroup[] {
  return NAV.map((group) => ({ ...group, items: group.items.filter(allowed) })).filter((group) => group.items.length > 0);
}
