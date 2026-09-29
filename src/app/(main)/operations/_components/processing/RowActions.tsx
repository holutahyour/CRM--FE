"use client";

import { Pencil, Trash2 } from "lucide-react";

/** Edit / delete buttons at the end of a Processing table row. */
export default function RowActions({
  label,
  onEdit,
  onDelete,
}: {
  /** What the row is, e.g. "batch HI925001" — used in the buttons' accessible names. */
  label: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      {onEdit && (
        <button
          type="button"
          aria-label={`Edit ${label}`}
          title={`Edit ${label}`}
          onClick={onEdit}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          aria-label={`Delete ${label}`}
          title={`Delete ${label}`}
          onClick={() => {
            if (window.confirm(`Delete ${label}? This cannot be undone.`)) onDelete();
          }}
          className="text-red-500 hover:text-red-700 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
