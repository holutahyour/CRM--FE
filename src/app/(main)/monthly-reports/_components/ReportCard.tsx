"use client";

import { Target, Building2, User2, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { MonthlyReport, achievementPct, fmtMonth } from "./types";

interface ReportCardProps {
  report: MonthlyReport;
}

function StatusPill({ pct }: { pct: number }) {
  if (pct >= 100)
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
        Exceeded
      </span>
    );
  if (pct >= 80)
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-200">
        On Track
      </span>
    );
  if (pct >= 50)
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
        At Risk
      </span>
    );
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
      Behind
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100);
  const color =
    pct >= 100 ? "bg-green-500" : pct >= 80 ? "bg-green-400" : pct >= 50 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export default function ReportCard({ report }: ReportCardProps) {
  const pct = achievementPct(report);
  const dept = report.department?.name ?? report.departmentName ?? "—";
  const submitter = report.submittedByName ?? "—";
  const period = fmtMonth(report.month, report.year);

  const TrendIcon =
    pct >= 100 ? TrendingUp : pct >= 80 ? TrendingUp : pct >= 50 ? Minus : TrendingDown;
  const trendColor =
    pct >= 100 ? "text-green-500" : pct >= 80 ? "text-green-400" : pct >= 50 ? "text-yellow-500" : "text-red-400";

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm mb-4 p-6 space-y-4">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Target className="w-4 h-4 text-gray-500 shrink-0" />
          <span className="font-semibold text-gray-900 text-base">{report.goalTitle}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TrendIcon className={`w-4 h-4 ${trendColor}`} />
          <span
            className={`text-lg font-bold ${
              pct >= 100 ? "text-green-600" : pct >= 80 ? "text-green-500" : pct >= 50 ? "text-yellow-600" : "text-red-500"
            }`}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {period}
        </span>
        <span className="flex items-center gap-1">
          <User2 className="w-3.5 h-3.5" />
          {submitter}
        </span>
        <span className="flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5" />
          {dept}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-700">Progress</span>
          <span className="text-gray-500">
            {report.achievedValue.toLocaleString()} / {report.targetValue.toLocaleString()}
          </span>
        </div>
        <ProgressBar pct={pct} />
      </div>

      {/* Notes + status */}
      {report.notes && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-0.5">Notes:</p>
          <p className="text-sm text-gray-500">{report.notes}</p>
        </div>
      )}

      <div>
        <StatusPill pct={pct} />
      </div>
    </div>
  );
}
