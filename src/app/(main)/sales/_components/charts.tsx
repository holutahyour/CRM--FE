"use client";

import { BarChart2 } from "lucide-react";

// Shared chart styling for the EPL Poultry and Fresh Produce dashboards.

export const PIE_COLORS = ["#16a34a", "#4ade80", "#f59e0b", "#3b82f6", "#8b5cf6", "#06b6d4"];

export const TOOLTIP_STYLE = { borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 };
export const AXIS_TICK = { fontSize: 11, fill: "#9ca3af" };
export const LEGEND_STYLE = { fontSize: 12, color: "#6b7280", paddingTop: 8 };

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-56 text-gray-400">
      <BarChart2 className="w-8 h-8 opacity-30 mr-2" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
