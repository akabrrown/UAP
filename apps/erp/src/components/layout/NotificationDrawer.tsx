"use client";

import Link from "next/link";
import { X, CheckCircle, ArrowRight, Bell, Clock, ArrowLeftRight, CheckCheck } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  href: string;
  time: string;
  unread: boolean;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
}: NotificationDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
      />

      {/* Floating Popover Panel */}
      <div className="absolute right-6 top-16 z-50 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-navy-900" />
            <h3 className="text-xs font-semibold text-ink">System Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllRead}
              className="text-[11px] text-slate-500 hover:text-navy-900 font-medium inline-flex items-center gap-1"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark read
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 rounded p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No new alerts or pending tasks.
            </div>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={n.href}
                onClick={onClose}
                className={`block p-3.5 hover:bg-slate-50 transition-colors ${
                  n.unread ? "bg-navy-50/30" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {n.unread && (
                      <span className="w-1.5 h-1.5 rounded-full bg-navy-800 shrink-0" />
                    )}
                    <h4 className="text-xs font-semibold text-ink">{n.title}</h4>
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0 font-mono">
                    <Clock className="w-2.5 h-2.5" />
                    {n.time}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed pl-3">
                  {n.description}
                </p>
                <div className="mt-2 pl-3 flex items-center gap-1 text-[11px] text-gold-600 font-medium">
                  Review Details <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-center">
          <Link
            href="/approvals"
            onClick={onClose}
            className="text-[11px] font-semibold text-navy-900 hover:text-navy-700"
          >
            Go to Approvals Desk →
          </Link>
        </div>
      </div>
    </>
  );
}
