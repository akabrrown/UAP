"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCw, Home } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-5 rounded-full bg-red-50 border border-red-200">
          <AlertOctagon className="w-8 h-8 text-fail" />
        </div>

        <h1 className="text-xl font-semibold text-ink tracking-tight mb-2">
          System Error
        </h1>

        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          An unexpected application error interrupted the session. You may reload the view or return to the main console.
        </p>

        {error?.digest && (
          <div className="mb-6 p-2.5 bg-slate-50 rounded border border-slate-200 text-xs text-slate-500 font-mono">
            Diagnostic Digest: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-navy-900 text-white text-xs font-semibold rounded hover:bg-navy-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Page
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-ink text-xs font-semibold rounded hover:bg-slate-50 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
