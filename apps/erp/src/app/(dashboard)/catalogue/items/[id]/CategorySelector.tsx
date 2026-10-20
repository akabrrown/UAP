"use client";

import { useState, useTransition } from "react";
import { updateItemCategoryAction } from "./actions";
import { Check, Edit2, X } from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
}

export function CategorySelector({
  itemId,
  currentCategoryId,
  currentCategoryName,
  categories,
}: {
  itemId: string;
  currentCategoryId: string | null;
  currentCategoryName: string | null;
  categories: CategoryOption[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(currentCategoryId || "");
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateItemCategoryAction(itemId, selectedId || null);
      if (res.success) {
        setIsEditing(false);
      }
    });
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-800">
          {currentCategoryName || "Uncategorized"}
        </span>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs text-navy-800 hover:text-navy-900 underline flex items-center gap-1 font-medium transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="h-8 px-2 text-xs rounded border border-slate-300 bg-white focus:border-navy-800 outline-none"
      >
        <option value="">(None)</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={isPending}
        onClick={handleSave}
        className="h-8 px-2 bg-navy-900 hover:bg-navy-800 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
      >
        <Check className="w-3 h-3" />
        {isPending ? "..." : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setSelectedId(currentCategoryId || "");
          setIsEditing(false);
        }}
        className="h-8 px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
