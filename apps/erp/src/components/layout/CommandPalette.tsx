"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Layers,
  Cpu,
  Receipt,
  CheckCircle2,
  Wrench,
  BarChart3,
  Shield,
  PlusCircle,
  ArrowRight,
  History,
  Building2,
} from "lucide-react";

interface NavOption {
  title: string;
  category: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

const COMMAND_OPTIONS: NavOption[] = [
  { title: "Console Dashboard", category: "Navigation", path: "/", icon: LayoutDashboard },
  { title: "Item Catalogue", category: "Navigation", path: "/catalogue", icon: Package },
  { title: "Add New Item", category: "Quick Actions", path: "/catalogue/items/new", icon: PlusCircle },
  { title: "Internal Sales Orders", category: "Navigation", path: "/orders", icon: ShoppingCart },
  { title: "New Sales Order", category: "Quick Actions", path: "/orders/new", icon: PlusCircle },
  { title: "Procurement & POs", category: "Navigation", path: "/procurement", icon: Truck },
  { title: "Issue Purchase Order", category: "Quick Actions", path: "/procurement/new", icon: PlusCircle },
  { title: "Suppliers Directory", category: "Navigation", path: "/procurement/suppliers", icon: Building2 },
  { title: "Goods Receipts (GRN)", category: "Navigation", path: "/procurement/grn", icon: Truck },
  { title: "Receive Goods (GRN)", category: "Quick Actions", path: "/procurement/grn/new", icon: PlusCircle },
  { title: "Inventory & Stock Levels", category: "Navigation", path: "/inventory", icon: Layers },
  { title: "New Stock Transfer", category: "Quick Actions", path: "/inventory/transfers/new", icon: PlusCircle },
  { title: "Assembly & Manufacturing", category: "Navigation", path: "/production", icon: Cpu },
  { title: "New Assembly Order", category: "Quick Actions", path: "/production/new", icon: PlusCircle },
  { title: "Finance & Invoices", category: "Navigation", path: "/finance", icon: Receipt },
  { title: "Create Invoice", category: "Quick Actions", path: "/finance/invoices/new", icon: PlusCircle },
  { title: "Dual-Custody Approvals", category: "Navigation", path: "/approvals", icon: CheckCircle2 },
  { title: "Service & Warranty Tickets", category: "Navigation", path: "/service", icon: Wrench },
  { title: "Log Service Ticket", category: "Quick Actions", path: "/service/new", icon: PlusCircle },
  { title: "Executive Analytics & Reports", category: "Navigation", path: "/reports", icon: BarChart3 },
  { title: "System Administration & Users", category: "Navigation", path: "/admin", icon: Shield },
  { title: "System Audit Trail & Event Logs", category: "Navigation", path: "/admin/audit", icon: History },
];

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const filteredOptions = COMMAND_OPTIONS.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()) ||
      item.path.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredOptions[selectedIndex]) {
          router.push(filteredOptions[selectedIndex].path);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredOptions, selectedIndex, router, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a module name or action (e.g. invoice, transfer, approval)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-xs text-ink placeholder-slate-400 outline-none bg-transparent"
          />
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-50">
          {filteredOptions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching commands or routes found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const Icon = opt.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={opt.path}
                  onClick={() => {
                    router.push(opt.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-colors ${
                    isSelected ? "bg-navy-900 text-white" : "hover:bg-slate-50 text-ink"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center ${
                        isSelected ? "bg-navy-800 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-snug">{opt.title}</p>
                      <p
                        className={`text-[10px] ${
                          isSelected ? "text-slate-300" : "text-slate-400"
                        }`}
                      >
                        {opt.category} · {opt.path}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-3.5 h-3.5 ${
                      isSelected ? "text-white" : "text-slate-300"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] text-slate-400">
          <span>Navigate with ↑ / ↓ arrows · Enter to jump</span>
          <span>ESC to dismiss</span>
        </div>
      </div>
    </div>
  );
}
