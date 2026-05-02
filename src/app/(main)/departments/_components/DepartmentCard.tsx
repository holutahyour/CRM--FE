"use client";

import {
  Building2, Users, Settings, Wallet, Package, TrendingUp,
  DollarSign, Boxes, Leaf, BarChart2, FlaskConical, Truck,
} from "lucide-react";
import { Department, DEPT_COLORS, fmtBudget } from "./types";

// Map department names to icons — fallback to Building2
const ICON_MAP: Record<string, React.ElementType> = {
  Operations: Settings,
  Logistics:  Truck,
  Inventory:  Boxes,
  Sales:      TrendingUp,
  Finance:    DollarSign,
  Processing: FlaskConical,
  Agronomy:   Leaf,
};

interface DepartmentCardProps {
  dept: Department;
  colorIndex: number;
  onEdit?: (dept: Department) => void;
}

export default function DepartmentCard({ dept, colorIndex, onEdit }: DepartmentCardProps) {
  const color = DEPT_COLORS[colorIndex % DEPT_COLORS.length];
  const Icon  = ICON_MAP[dept.name] ?? Building2;

  const staff    = dept.staffCount   ?? dept.userCount   ?? dept.membersCount ?? 0;
  const projects = dept.activeProjects ?? dept.projectCount ?? 0;
  const budget   = dept.budget ?? dept.totalBudget ?? 0;
  const headName = dept.headName ?? dept.head?.name ?? "—";
  const code     = dept.code ?? dept.departmentId ?? "—";

  return (
    <div
      className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col gap-3"
      onClick={() => onEdit?.(dept)}
    >
      {/* Header — icon + name + head */}
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl ${color.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${color.icon}`} />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 leading-tight">{dept.name}</h3>
          <p className={`text-xs ${color.text} truncate`}>{headName}</p>
        </div>
      </div>

      {/* Description */}
      {dept.description && (
        <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{dept.description}</p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 pt-1">
        {/* Staff */}
        <div className="flex flex-col items-center gap-0.5">
          <Users className={`w-4 h-4 ${color.text}`} />
          <span className={`text-base font-bold ${color.text}`}>{staff}</span>
          <span className="text-[10px] text-gray-400">Staff</span>
        </div>

        {/* Projects */}
        <div className="flex flex-col items-center gap-0.5">
          <Settings className={`w-4 h-4 ${color.text}`} />
          <span className={`text-base font-bold ${color.text}`}>{projects}</span>
          <span className="text-[10px] text-gray-400">Projects</span>
        </div>

        {/* Budget */}
        <div className="flex flex-col items-center gap-0.5">
          <Wallet className={`w-4 h-4 ${color.text}`} />
          <span className={`text-base font-bold ${color.text}`}>{fmtBudget(budget)}</span>
          <span className="text-[10px] text-gray-400">Budget</span>
        </div>
      </div>

      {/* Department ID badge */}
      <div className="border border-gray-100 rounded-lg px-3 py-1.5 text-center bg-gray-50 mt-auto">
        <span className="text-xs text-gray-400">Department ID: <span className="font-medium text-gray-600">{code}</span></span>
      </div>
    </div>
  );
}
