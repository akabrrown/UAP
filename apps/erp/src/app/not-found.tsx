import Link from "next/link";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-5 rounded-full bg-slate-50 border border-slate-200">
          <FileQuestion className="w-8 h-8 text-slate-500" />
        </div>

        <div className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 tracking-wider uppercase mb-3">
          Error 404
        </div>

        <h1 className="text-xl font-semibold text-ink tracking-tight mb-2">
          Page Not Found
        </h1>

        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          The requested page, record, or document could not be located. It may have been moved, removed, or the link may be outdated.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-navy-900 text-white text-xs font-semibold rounded hover:bg-navy-800 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
