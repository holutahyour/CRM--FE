"use client";

import { useState, useEffect } from "react";
import { Loader, CheckCircle, XCircle, Package, Building2, User2, Calendar, ShieldCheck } from "lucide-react";
import { ItemRequest, STATUS_BADGE, fmtDate } from "./types";
import { IApprovalHistory, IWorkflowStep, WorkflowStepStatus } from "@/data/interface/IWorkflow";
import ApprovalWorkflowStepper from "@/components/app/ApprovalWorkflowStepper";
import ApprovalHistoryTimeline from "@/components/app/ApprovalHistoryTimeline";
import RejectionReasonBanner from "@/components/app/RejectionReasonBanner";
import apiHandler from "@/data/api/ApiHandler";

interface ItemRequestCardProps {
  req: ItemRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  actionBusy: string | null;
  /** Increment to force a re-fetch of approval history (e.g. after approve/reject) */
  refreshKey?: number;
}

function deriveStepStatus(step: IWorkflowStep, history: IApprovalHistory): WorkflowStepStatus {
  const record = history.records.find(r => r.stepOrder === step.stepOrder);
  if (!record) return step.stepOrder === history.currentStepOrder ? 'pending' : 'waiting';
  if (record.status === 'Approved') return 'approved';
  if (record.status === 'Rejected') return 'rejected';
  return 'pending';
}

export default function ItemRequestCard({ req, onApprove, onReject, actionBusy, refreshKey = 0 }: ItemRequestCardProps) {
  const statusKey = req.status === 1 ? "Pending" : req.status === 2 ? "Approved" : req.status === 3 ? "Rejected" : req.status;
  const badge = STATUS_BADGE[statusKey as string] ?? STATUS_BADGE.Pending;
  const dept = req.department?.name || req.departmentName || "—";
  const submittedBy = req.requestedBy || req.createdByName || "—";
  const actionedBy = req.actionedByName || null;
  const date = fmtDate(req.date || req.createdAt);
  const isPending = statusKey === "Pending" || req.status === 1;
  const busy = actionBusy === req.id;
  const itemName = req.itemName || req.title || req.name || "—";
  const purpose = req.purpose || req.description || "No purpose provided.";

  const [history, setHistory] = useState<IApprovalHistory | null>(null);

  useEffect(() => {
    apiHandler.itemRequests.getApprovalHistory(req.id)
      .then(res => { if (res?.isSuccess) setHistory(res.content); })
      .catch(() => {});
  }, [req.id, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const stepperSteps = history?.workflowSteps.map(step => ({
    name: step.stepName,
    status: deriveStepStatus(step, history),
  })) ?? [];
  const rejectionNote = history?.records.find(r => r.status === 'Rejected')?.notes;

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm mb-4">
      {/* Card Header & Content */}
      <div className="flex justify-between items-start p-6">
        <div className="space-y-3 flex-1">
          {/* Title and Badge */}
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-gray-700 shrink-0" />
            <span className="font-semibold text-gray-900 text-base">{itemName}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize tracking-wider ${badge.className}`}>
              {badge.label}
            </span>
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              {dept}
            </span>
            <span className="flex items-center gap-1">
              <User2 className="w-3.5 h-3.5" />
              {submittedBy}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {date}
            </span>
            {actionedBy && (
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-xs">Actioned by</span> {actionedBy}
              </span>
            )}
          </div>

          {/* Purpose */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-900">Purpose:</p>
            <p className="text-sm text-gray-500">{purpose}</p>
          </div>
        </div>

        {/* Quantity */}
        <div className="flex flex-col items-end ml-6 shrink-0">
          <span className="text-xs font-medium text-gray-500 mb-1">Quantity</span>
          <span className="text-2xl font-bold text-gray-900">{req.quantity ?? "—"}</span>
        </div>
      </div>

      {/* Approval Workflow Stepper */}
      {stepperSteps.length > 0 && (
        <div className="px-6 pb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Approval Workflow:</p>
          <ApprovalWorkflowStepper steps={stepperSteps} />
        </div>
      )}

      {/* Rejection Reason (from workflow history) */}
      <RejectionReasonBanner reason={rejectionNote} />

      {/* Rejection Reason (legacy inline field) */}
      {statusKey === "Rejected" && req.reason && !rejectionNote && (
        <div className="mx-6 mb-6 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-red-600 mb-0.5">Rejection Reason:</p>
          <p className="text-sm text-red-500">{req.reason}</p>
        </div>
      )}

      {/* Approval History Timeline */}
      {history && history.records.length > 0 && (
        <div className="px-6 pb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Approval History:</p>
          <ApprovalHistoryTimeline records={history.records} />
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="px-6 pb-6 flex gap-3 mt-2">
          <button
            disabled={busy}
            onClick={() => onApprove(req.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {busy ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Approve
          </button>
          <button
            disabled={busy}
            onClick={() => onReject(req.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {busy ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
