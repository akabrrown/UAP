"use client";

import { useState, useTransition } from "react";
import { Play, Loader2 } from "lucide-react";
import { releaseAssemblyOrderAction } from "./actions";

interface ReleaseButtonProps {
  aoId: string;
}

export function ReleaseButton({ aoId }: ReleaseButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRelease() {
    setError(null);
    startTransition(async () => {
      const res = await releaseAssemblyOrderAction(aoId);
      if (res?.error) {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleRelease}
        disabled={isPending}
        className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4 fill-current" />
        )}
        Release to Shop Floor
      </button>
      {error && (
        <span className="text-xs text-fail font-medium">{error}</span>
      )}
    </div>
  );
}
