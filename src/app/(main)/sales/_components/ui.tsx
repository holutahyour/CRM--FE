"use client";

import React from "react";
import { Loader, Trash2 } from "lucide-react";

// The Sales screens use the same visual language as Operations, so the shared
// primitives (modal shell, table shell, fields, buttons) are re-exported from
// there rather than duplicated.
export {
  SectionHeader,
  PrimaryButton,
  TableShell,
  Badge,
  Field,
  TextInput,
  SelectInput,
  TextareaInput,
  OperationsModal as SalesModal,
} from "@/app/(main)/operations/_components/ui";

export interface SalesTabDef {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** Full-width pill tab bar, used for both the division switch and each division's sections. */
export function SalesTabs({
  tabs,
  active,
  onChange,
  ariaLabel,
}: {
  tabs: SalesTabDef[];
  active: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex bg-gray-100 rounded-full p-1 overflow-x-auto"
    >
      {tabs.map((t) => {
        const isActive = t.value === active;
        const Icon = t.icon;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(t.value)}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Placeholder shown while a division's records load. */
export function TabLoader() {
  return (
    <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
      <Loader className="w-6 h-6 text-green-500 animate-spin" />
    </div>
  );
}

/**
 * Why a save was refused, shown above the form's fields. `role="alert"` so the
 * reason is announced rather than only appearing further up a scrolled modal.
 */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {message}
    </p>
  );
}

/** Red trash button ending every record row. */
export function DeleteRowButton({
  label,
  onDelete,
}: {
  label: string;
  onDelete: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onDelete}
      className="text-red-500 hover:text-red-700 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

/** White panel used for the dashboard charts and summary lists. */
export function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** Headline metric tile — the coloured left border keys it to its section. */
export function StatCard({
  label,
  value,
  hint,
  accent = "gray",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "green" | "blue" | "amber" | "red" | "gray";
}) {
  const accents: Record<string, { border: string; value: string }> = {
    green: { border: "border-l-4 border-l-[#7cc843]", value: "text-[#3f8f1f]" },
    blue:  { border: "border-l-4 border-l-blue-500",  value: "text-blue-600" },
    amber: { border: "border-l-4 border-l-amber-500", value: "text-amber-600" },
    red:   { border: "border-l-4 border-l-red-500",   value: "text-red-600" },
    gray:  { border: "", value: "text-gray-900" },
  };
  const a = accents[accent] ?? accents.gray;
  return (
    <div className={`bg-white border border-gray-100 rounded-xl shadow-sm p-5 ${a.border}`}>
      <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${a.value}`}>{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

/** One label/value line inside the Module Summaries panel. */
export function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-semibold ${valueClassName ?? "text-gray-900"}`}>{value}</span>
    </div>
  );
}
