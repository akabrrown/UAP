"use client";

import { Bell, Search, UserCircle } from "lucide-react";
import type { Session } from "@/lib/session";
import { logoutAction } from "@/app/login/actions";

export function Header({ session }: { session: Session }) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      {/* Global Search / Command Palette trigger */}
      <div className="flex-1 flex items-center">
        <button className="flex items-center gap-2 text-sm text-slate-500 bg-canvas border border-slate-200 hover:border-slate-300 rounded-[4px] px-3 py-1.5 w-64 transition-colors">
          <Search className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">Search anything...</span>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] font-medium text-slate-500">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        <button className="relative text-slate-500 hover:text-ink transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-fail rounded-full border border-white" />
        </button>
        
        <div className="w-px h-6 bg-slate-200" />
        
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-ink leading-none">{session.fullName}</p>
            <p className="text-xs text-slate-500 mt-1 capitalize">{session.role.replace('_', ' ')}</p>
          </div>
          <button 
            onClick={() => logoutAction()}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-navy-50 text-navy-800 hover:bg-navy-100 transition-colors"
            title="Sign out"
          >
            <UserCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
