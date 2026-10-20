"use client";

import { useTransition } from "react";
import { deleteBomLineAction } from "./actions";
import { Trash2 } from "lucide-react";

export function DeleteBomLineButton({
  lineId,
  itemId,
  componentName,
}: {
  lineId: string;
  itemId: string;
  componentName: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm(`Remove "${componentName}" from this BOM?`)) {
      startTransition(async () => {
        const res = await deleteBomLineAction(lineId, itemId);
        if (!res.success) {
          alert(res.error || "Failed to remove component");
        }
      });
    }
  };

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleDelete}
      title="Remove component"
      className="p-1 text-slate-400 hover:text-rose-600 transition-colors rounded hover:bg-rose-50 disabled:opacity-50"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
