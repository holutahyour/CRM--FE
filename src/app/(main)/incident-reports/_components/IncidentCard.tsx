"use client";

import {
  Monitor,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User2,
  Building2,
  Calendar,
  Loader,
  CircleDot,
} from "lucide-react";
import { Incident, SEVERITY_BADGE, STATUS_BADGE, fmtDate } from "./types";

interface IncidentCardProps {
  incident: Incident;
  onMarkInProgress: (id: string) => void;
  onMarkResolved: (id: string) => void;
  actionBusy: string | null;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  open:        <CircleDot className="w-4 h-4 text-gray-500" />,
  in_progress: <Clock className="w-4 h-4 text-yellow-500" />,
  resolved:    <CheckCircle2 className="w-4 h-4 text-green-500" />,
  closed:      <CheckCircle2 className="w-4 h-4 text-gray-400" />,
};

export default function IncidentCard({
  incident,
  onMarkInProgress,
  onMarkResolved,
  actionBusy,
}: IncidentCardProps) {
  const severityKey = (incident.severity || "").toLowerCase();
  const statusKey   = (incident.status  || "").toLowerCase();

  const severityBadge = SEVERITY_BADGE[severityKey] ?? { label: severityKey, className: "bg-gray-100 text-gray-600" };
  const statusBadge   = STATUS_BADGE[statusKey]     ?? { label: statusKey,   className: "bg-gray-100 text-gray-600" };

  const dept        = incident.department?.name || incident.departmentName || "—";
  const reporter    = incident.reportedByName || incident.reportedBy || "—";
  const date        = fmtDate(incident.createdAt);
  const isOpen      = statusKey === "open";
  const isInProgress = statusKey === "in_progress";
  const isResolved  = statusKey === "resolved" || statusKey === "closed";
  const busy        = actionBusy === incident.id;

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm mb-4">
      {/* Main content */}
      <div className="p-6 space-y-3">
        {/* Title row */}
        <div className="flex items-center gap-3 flex-wrap">
          <Monitor className="w-4 h-4 text-gray-500 shrink-0" />
          <span className="font-semibold text-gray-900">
            {incident.deviceName}
          </span>
          <span className="text-gray-400 text-sm font-mono">· {incident.deviceCode}</span>

          {/* severity badge */}
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${severityBadge.className}`}>
            {severityBadge.label}
          </span>

          {/* status badge */}
          <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
            {STATUS_ICON[statusKey]}
            {statusBadge.label}
          </span>
        </div>

        {/* Meta: reporter, dept, date */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <User2 className="w-3.5 h-3.5" />
            {reporter}
          </span>
          <span className="flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            {dept}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {date}
          </span>
        </div>

        {/* Issue description */}
        <div>
          <p className="text-xs font-semibold text-orange-600 mb-0.5">Issue Description:</p>
          <p className="text-sm text-orange-500">{incident.description}</p>
        </div>

        {/* Resolution box (only when resolved/closed) */}
        {isResolved && incident.resolution && (
          <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-green-700 mb-0.5">Resolution:</p>
            <p className="text-sm text-green-600">{incident.resolution}</p>
            {incident.resolvedAt && (
              <p className="text-xs text-green-400 mt-1">
                Resolved on: {fmtDate(incident.resolvedAt)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {(isOpen || isInProgress) && (
        <div className="px-6 pb-6 flex gap-3">
          {isOpen && (
            <button
              disabled={busy}
              onClick={() => onMarkInProgress(incident.id)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 transition-colors"
            >
              {busy ? <Loader className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              Start Work
            </button>
          )}
          {isInProgress && (
            <button
              disabled={busy}
              onClick={() => onMarkResolved(incident.id)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {busy ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Mark as Resolved
            </button>
          )}
        </div>
      )}
    </div>
  );
}
