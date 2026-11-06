"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { visibleNavForRole } from "@/lib/nav";
import { usePerspective } from "@/lib/perspective";
import { type Session } from "@/lib/session-utils";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Eye, RotateCcw } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  management: "Management",
  procurement_imports: "Procurement & Imports",
  inventory_sales: "Inventory & Sales",
  finance_service: "Finance & Service",
  assembly_technician: "Assembly Tech",
  qc_inspector: "QC Inspector",
};

export function Sidebar({ session }: { session: Session }) {
  const pathname = usePathname();
  const [perspective, setPerspective] = usePerspective(session.role);

  // If user is super_admin or management, allow filtering by perspective
  const isPrivileged = session.role === "super_admin" || session.role === "management";
  const effectiveRole = isPrivileged && perspective ? perspective : session.role;

  // Filter nav groups strictly based on the chosen role perspective
  const navGroups = visibleNavForRole(effectiveRole);
  const isFiltered = isPrivileged && perspective && perspective !== "super_admin";

  return (
    <aside className="w-[240px] flex-shrink-0 bg-navy-900 text-white flex flex-col h-full border-r border-navy-800">
      {/* Logo Area */}
      <div className="h-14 flex items-center px-4 font-semibold text-lg border-b border-navy-800 shrink-0">
        <div className="relative w-8 h-8 rounded-full bg-navy-800 overflow-hidden border border-gold-500/30 flex items-center justify-center mr-3 shrink-0">
          <Image 
            src="/logo.jpg" 
            alt="Techcore Logo" 
            fill 
            className="object-cover" 
            sizes="32px"
            unoptimized
          />
        </div>
        <span className="truncate">Techcore</span>
      </div>

      {/* Role Perspective Indicator (Active when switching role perspective) */}
      {isFiltered && (
        <div className="mx-3 mt-3 px-2.5 py-1.5 rounded bg-navy-800/90 border border-gold-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Eye className="w-3.5 h-3.5 text-gold-400 shrink-0" />
            <span className="truncate text-[11px] font-medium text-gold-300">
              {ROLE_LABELS[effectiveRole] || effectiveRole}
            </span>
          </div>
          <button
            onClick={() => setPerspective("super_admin")}
            title="Reset to Full Navigation"
            className="text-[10px] text-navy-200 hover:text-white flex items-center gap-0.5 hover:underline shrink-0 font-medium"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>All</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6 no-scrollbar">
        {navGroups.map((group) => (
          <div key={group.label} className="px-3">
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-navy-100/50">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && item.href !== "/admin" && pathname.startsWith(item.href + "/"));
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-2 py-1.5 rounded-[4px] text-sm transition-colors relative",
                      isActive 
                        ? "bg-navy-800 text-white font-medium" 
                        : "text-navy-50 hover:bg-navy-800/50"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-gold-500 rounded-r-full" />
                    )}
                    <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-gold-500" : "text-navy-100/70")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      
      {/* User Area */}
      <div className="p-4 border-t border-navy-800 shrink-0 text-sm text-navy-100/70 flex items-center justify-between">
        <span className="truncate">{session.fullName}</span>
        {isFiltered && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold-500/20 text-gold-300 font-mono">
            {effectiveRole.split("_")[0]}
          </span>
        )}
      </div>
    </aside>
  );
}
