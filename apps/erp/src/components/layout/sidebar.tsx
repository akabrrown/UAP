"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { visibleNav } from "@/lib/nav";
import { hasAnyScope, type Session } from "@/lib/session-utils";
import { cn } from "@/lib/utils";

export function Sidebar({ session }: { session: Session }) {
  const pathname = usePathname();
  
  // Filter nav groups based on user scopes
  const navGroups = visibleNav((item) => hasAnyScope(session, item.anyScope));

  return (
    <aside className="w-[240px] flex-shrink-0 bg-navy-900 text-white flex flex-col h-full border-r border-navy-800">
      {/* Logo Area */}
      <div className="h-14 flex items-center px-4 font-semibold text-lg border-b border-navy-800 shrink-0">
        <div className="w-8 h-8 rounded-full bg-navy-800 border border-gold-500/30 flex items-center justify-center mr-3 shrink-0">
          <span className="text-gold-500 text-xs font-bold">UAP</span>
        </div>
        <span className="truncate">UPSA Assembly Unit</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label} className="px-3">
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-navy-100/50">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
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
      
      {/* User Area - Optional simplified view since Header has user menu */}
      <div className="p-4 border-t border-navy-800 shrink-0 text-sm text-navy-100/70 truncate">
        {session.fullName}
      </div>
    </aside>
  );
}
