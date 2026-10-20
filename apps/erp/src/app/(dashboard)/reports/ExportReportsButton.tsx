"use client";

import { Download } from "lucide-react";

interface ReportData {
  totalStockVal: number;
  totalUnits: number;
  activeAssemblies: number;
  completedAssemblies: number;
  openTickets: number;
  urgentTickets: number;
  totalInvoiced: number;
  invoiceCount: number;
  categories: Array<{ category_name: string; item_count: number; total_qty: string | number }>;
  serviceKinds: Array<{ kind: string; count: number }>;
}

export function ExportReportsButton({ data }: { data: ReportData }) {
  const handleExport = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const rows = [
      ["Techcore Operational Metrics Summary", timestamp],
      [],
      ["Metric", "Value"],
      ["Total Stock Valuation (GHS)", data.totalStockVal.toFixed(2)],
      ["Total Stock Units On Hand", data.totalUnits],
      ["Active Assembly Orders", data.activeAssemblies],
      ["Completed Assembly Orders", data.completedAssemblies],
      ["Open Service Tickets", data.openTickets],
      ["High/Urgent Service Tickets", data.urgentTickets],
      ["Total Invoiced Revenue (GHS)", data.totalInvoiced.toFixed(2)],
      ["Billed Invoice Count", data.invoiceCount],
      [],
      ["Inventory Breakdown by Category"],
      ["Category", "Unique Items", "Units On Hand"],
      ...data.categories.map((c) => [c.category_name, c.item_count, c.total_qty]),
      [],
      ["Service Tickets Breakdown by Kind"],
      ["Ticket Kind", "Count"],
      ...data.serviceKinds.map((sk) => [sk.kind, sk.count]),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((r) => r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `techcore-operations-report-${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleExport}
      className="h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded flex items-center gap-2 transition-colors shadow-xs"
    >
      <Download className="w-3.5 h-3.5 text-slate-500" />
      Export CSV Report
    </button>
  );
}
