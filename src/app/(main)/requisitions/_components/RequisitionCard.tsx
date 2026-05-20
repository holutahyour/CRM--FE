"use client";

import { useState, useEffect } from "react";
import { Loader, CheckCircle, XCircle, Building2, User, Calendar, FileText } from "lucide-react";
import { Requisition, STATUS_BADGE, fmt, fmtDate } from "./types";
import { IApprovalHistory, IWorkflowStep, WorkflowStepStatus } from "@/data/interface/IWorkflow";
import ApprovalWorkflowStepper from "@/components/app/ApprovalWorkflowStepper";
import ApprovalHistoryTimeline from "@/components/app/ApprovalHistoryTimeline";
import RejectionReasonBanner from "@/components/app/RejectionReasonBanner";
import apiHandler from "@/data/api/ApiHandler";

interface RequisitionCardProps {
  req: Requisition;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  actionBusy: string | null;
}

function deriveStepStatus(step: IWorkflowStep, history: IApprovalHistory): WorkflowStepStatus {
  const record = history.records.find(r => r.stepOrder === step.stepOrder);
  if (!record) return step.stepOrder === history.currentStepOrder ? 'pending' : 'waiting';
  if (record.status === 'Approved') return 'approved';
  if (record.status === 'Rejected') return 'rejected';
  return 'pending';
}

export default function RequisitionCard({ req, onApprove, onReject, actionBusy }: RequisitionCardProps) {
  const badge = STATUS_BADGE[req.status] ?? STATUS_BADGE.Pending;
  const dept = req.department?.name || req.departmentName || "—";
  const date = fmtDate(req.date || req.createdAt);
  const isPending = req.status === "Pending";
  const busy = actionBusy === req.id;

  const [history, setHistory] = useState<IApprovalHistory | null>(null);

  useEffect(() => {
    apiHandler.requisitions.getApprovalHistory(req.id)
      .then(res => { if (res?.isSuccess) setHistory(res.content); })
      .catch(() => {});
  }, [req.id]);

  const stepperSteps = history?.workflowSteps.map(step => ({
    name: step.stepName,
    status: deriveStepStatus(step, history),
  })) ?? [];
  const rejectionNote = history?.records.find(r => r.status === 'Rejected')?.notes;

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="flex items-start justify-between px-6 pt-5 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-base">{req.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-green-600 flex-wrap">
            {dept !== "—" && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {dept}
              </span>
            )}
            {req.submittedByName && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {req.submittedByName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {date}
            </span>
            {req.actionedByName && (
              <span className={`flex items-center gap-1 ml-auto ${req.status === "Approved" || req.status === 2 ? "text-green-700 font-medium" : "text-red-600 font-medium"}`}>
                <User className="w-3 h-3" /> {req.status === "Approved" || req.status === 2 ? "Approved" : "Rejected"} by {req.actionedByName}
              </span>
            )}
          </div>
        </div>
        <span className="text-lg font-bold text-green-700 whitespace-nowrap ml-4">
          {fmt(req.amount)}
        </span>
      </div>

      {/* Description */}
      <div className="px-6 pb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description:</p>
        <p className="text-sm text-green-600">{req.description || "No description provided."}</p>
      </div>

      {/* File Link */}
      {req.fileUrl && (
        <div className="px-6 pb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Requisition File:</p>
          <a href={req.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline flex items-center gap-1">
            <FileText className="w-3 h-3" />{req.fileOriginalName ?? "Download"}
          </a>
        </div>
      )}

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
      {req.status === 3 && req.reason && !rejectionNote && (
        <div className="mx-6 mb-4 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
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

      {/* Approve / Reject Actions */}
      {isPending && (
        <div className="grid grid-cols-2 border-t border-gray-100">
          <button
            disabled={busy}
            onClick={() => onApprove(req.id)}
            className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {busy ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Approve
          </button>
          <button
            disabled={busy}
            onClick={() => onReject(req.id)}
            className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors border-l border-white/20"
          >
            {busy ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
