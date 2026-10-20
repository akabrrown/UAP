"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, AlertTriangle, ArrowLeft, RefreshCw, Home } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error caught:", error);
  }, [error]);

  const isForbidden =
    error?.message?.includes("Forbidden") ||
    error?.message?.includes("Missing required scope") ||
    error?.message?.includes("Unauthorized");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-5 rounded-full bg-slate-50 border border-slate-200">
          {isForbidden ? (
            <ShieldAlert className="w-8 h-8 text-fail" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-warn" />
          )}
        </div>

        <h1 className="text-xl font-semibold text-ink tracking-tight mb-2">
          {isForbidden ? "Access Restricted (403)" : "Something Went Wrong"}
        </h1>

        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          {isForbidden
            ? "Your account does not possess the required permissions or scopes to view this section. Contact your Techcore system administrator if you require elevated privileges."
            : error?.message || "An unexpected error occurred while processing this request. Our technical team has been notified."}
        </p>

        {error?.digest && !isForbidden && (
          <div className="mb-6 p-2.5 bg-slate-50 rounded border border-slate-200 text-xs text-slate-500 font-mono">
            Error Reference: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {!isForbidden ? (
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-navy-900 text-white text-xs font-semibold rounded hover:bg-navy-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          ) : (
            <button
              onClick={() => window.history.back()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Go Back
            </button>
          )}

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
