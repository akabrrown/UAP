"use client";

import { useEffect, useState } from "react";
import { Bell, Search, UserCircle } from "lucide-react";
import type { Session } from "@/lib/session";
import { logoutAction } from "@/app/login/actions";
import { CommandPalette } from "./CommandPalette";
import { NotificationDrawer } from "./NotificationDrawer";

const SAMPLE_NOTIFICATIONS = [
  {
    id: "notif-1",
    title: "Pending Approval Required",
    description: "Purchase Order PO-2026-0001 requires dual-custody approval before issuing.",
    href: "/approvals",
    time: "10m ago",
    unread: true,
  },
  {
    id: "notif-2",
    title: "Transfer Shipped",
    description: "Stock transfer TRF-2026-0001 has been marked in-transit to Main Warehouse.",
    href: "/inventory",
    time: "1h ago",
    unread: true,
  },
  {
    id: "notif-3",
    title: "Assembly Order Planned",
    description: "New build order AO-2026-0001 is awaiting material issue and routing release.",
    href: "/production",
    time: "2h ago",
    unread: false,
  },
];

export function Header({ session }: { session: Session }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <>
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 relative">
        {/* Global Search / Command Palette trigger */}
        <div className="flex-1 flex items-center">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 text-xs text-slate-500 bg-canvas border border-slate-200 hover:border-slate-300 rounded px-3 py-1.5 w-64 transition-colors"
          >
            <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="flex-1 text-left">Quick Search & Actions...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] font-medium text-slate-500">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className="relative text-slate-500 hover:text-ink transition-colors p-1 rounded"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-fail rounded-full border border-white" />
            )}
          </button>

          <div className="w-px h-6 bg-slate-200" />

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-ink leading-none">{session.fullName}</p>
              <div className="flex items-center justify-end gap-1.5 mt-1 text-[11px] text-slate-500">
                <span className="capitalize font-medium">{session.role.replace("_", " ")}</span>
                {session.staffNo && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono font-medium text-slate-600 bg-slate-100 px-1 py-0.5 rounded text-[10px] border border-slate-200">
                      ID: {session.staffNo}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => logoutAction()}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-navy-50 text-navy-800 hover:bg-navy-100 transition-colors"
              title="Sign out of Techcore"
            >
              <UserCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Floating Notification Popover */}
        <NotificationDrawer
          isOpen={isNotifOpen}
          onClose={() => setIsNotifOpen(false)}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
        />
      </header>

      {/* Global Command Palette Modal */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
