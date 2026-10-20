"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Package } from "lucide-react";
import { deleteItemAction } from "./items/[id]/actions";

interface CatalogueItem {
  id: string;
  sku: string;
  name: string;
  kind: string;
  uom: string;
  tracking: string;
  is_active: boolean;
  category_name: string | null;
}

export function CatalogueClient({ initialItems }: { initialItems: CatalogueItem[] }) {
  const [items, setItems] = useState<CatalogueItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const uniqueKinds = Array.from(new Set(items.map((i) => i.kind)));

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category_name && item.category_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesKind = kindFilter === "all" || item.kind === kindFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && item.is_active) ||
      (statusFilter === "inactive" && !item.is_active);

    return matchesSearch && matchesKind && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Catalogue</h1>
          <p className="text-sm text-slate-500">Manage item master, bill of materials, and price lists.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/catalogue/items/new"
            className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Item
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter items by SKU, name, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded border border-slate-300 bg-white focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none capitalize"
            >
              <option value="all">All Item Kinds</option>
              {uniqueKinds.map((k) => (
                <option key={k} value={k}>
                  {k.replace("_", " ")}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">SKU</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Item Name</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Category</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Kind</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Tracking</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No items found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-navy-900">{item.sku}</td>
                    <td className="px-4 py-3 text-ink font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.category_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{item.kind.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 capitalize">
                        {item.tracking}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/catalogue/items/${item.id}`}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded transition-colors"
                        >
                          View / Edit
                        </Link>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Delete or deactivate "${item.name}" (${item.sku})?`)) {
                              const res = await deleteItemAction(item.id);
                              if (res.success) {
                                setItems((prev: CatalogueItem[]) =>
                                  res.deactivated
                                    ? prev.map((it: CatalogueItem) => (it.id === item.id ? { ...it, is_active: false } : it))
                                    : prev.filter((it: CatalogueItem) => it.id !== item.id)
                                );
                              } else {
                                alert(res.error || "Failed to delete item");
                              }
                            }
                          }}
                          className="px-2 py-1 text-rose-600 hover:bg-rose-50 text-[11px] font-medium rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
