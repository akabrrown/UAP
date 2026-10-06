"use client";

import { useActionState } from "react";
import { createTicketAction } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewTicketPage() {
  const [state, formAction, isPending] = useActionState(createTicketAction, null);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/service" className="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Log Service Ticket</h1>
          <p className="text-sm text-slate-500">Record a new repair, warranty claim, or inspection.</p>
        </div>
      </div>

      <form action={formAction} className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-8">
          {state?.error && (
            <div className="p-3 bg-fail-bg border border-fail/20 rounded-[4px] text-fail text-sm">
              {state.error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="kind" className="block text-sm font-medium text-slate-700">Ticket Type</label>
              <select
                id="kind"
                name="kind"
                required
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors bg-white text-sm"
              >
                <option value="warranty_claim">Warranty Claim</option>
                <option value="paid_repair">Paid Repair</option>
                <option value="inspection">Inspection</option>
                <option value="preventive">Preventive Maintenance</option>
                <option value="complaint">Complaint</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="priority" className="block text-sm font-medium text-slate-700">Priority</label>
              <select
                id="priority"
                name="priority"
                required
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors bg-white text-sm"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-ink mb-4 uppercase tracking-wider">Customer Contact</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="contact_name" className="block text-sm font-medium text-slate-700">Contact Name</label>
                <input
                  id="contact_name"
                  name="contact_name"
                  type="text"
                  required
                  className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="contact_phone" className="block text-sm font-medium text-slate-700">Phone</label>
                <input
                  id="contact_phone"
                  name="contact_phone"
                  type="tel"
                  className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label htmlFor="contact_email" className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-ink mb-4 uppercase tracking-wider">Device Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="device_serial" className="block text-sm font-medium text-slate-700">Serial Number</label>
                <input
                  id="device_serial"
                  name="device_serial"
                  type="text"
                  className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
                  placeholder="Scan or enter SN"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="device_description" className="block text-sm font-medium text-slate-700">Device Description</label>
                <input
                  id="device_description"
                  name="device_description"
                  type="text"
                  className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
                  placeholder="e.g. UPSA Desktop i5 2026"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label htmlFor="fault_description" className="block text-sm font-medium text-slate-700">Fault Description / Reason</label>
                <textarea
                  id="fault_description"
                  name="fault_description"
                  required
                  rows={4}
                  className="w-full p-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm resize-y"
                  placeholder="Describe the issue reported by the customer..."
                />
              </div>
            </div>
          </div>

        </div>
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <Link href="/service" className="h-10 px-4 inline-flex items-center justify-center border border-slate-300 hover:bg-white text-slate-700 text-sm font-medium rounded-[4px] transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-6 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Log Ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}
