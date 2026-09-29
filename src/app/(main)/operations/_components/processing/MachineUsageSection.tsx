"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader, Plus } from "lucide-react";
import apiHandler from "@/data/api/ApiHandler";
import { APP_MACHINE_USAGE_MODAL } from "@/lib/routes";
import {
  MACHINE_STATUS_BADGE,
  MachineUsageLog,
  MOCK_MACHINE_USAGE_LOGS,
  fmtDate,
  fmtNumber,
  fmtText,
} from "../types";
import { Badge, PrimaryButton, SectionHeader, TableShell } from "../ui";
import { useOperationsModal } from "../use-operations-modal";
import AddMachineUsageLogModal from "../AddMachineUsageLogModal";

const USE_MOCK = process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true";

const MACHINE_COLUMNS = [
  "Date",
  "Machine",
  "Operator",
  "Start",
  "End",
  "Hours Used",
  "Output (kg)",
  "Downtime (mins)",
  "Status",
  "Remarks",
];

const cell = "px-4 py-3 whitespace-nowrap text-gray-700";

/** Machine run time, output and downtime. Not part of the workbook; no API behind it yet. */
export default function MachineUsageSection() {
  const [machineLogs, setMachineLogs] = useState<MachineUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const machineModal = useOperationsModal(APP_MACHINE_USAGE_MODAL);

  const fetchData = useCallback(async () => {
    try {
      if (USE_MOCK) {
        setMachineLogs(MOCK_MACHINE_USAGE_LOGS);
        return;
      }
      const machineRes = await apiHandler.operations.listMachineUsageLogs();
      if (machineRes?.isSuccess && Array.isArray(machineRes.content)) setMachineLogs(machineRes.content);
    } catch (e) {
      console.error("Failed to fetch machine usage logs", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const createMachineLog = async (log: Omit<MachineUsageLog, "id">) => {
    setSubmitting(true);
    try {
      let created: MachineUsageLog = { ...log, id: `machine-${Date.now()}` };
      if (!USE_MOCK) {
        const res = await apiHandler.operations.createMachineUsageLog(log);
        if (res?.isSuccess && res.content) created = res.content;
      }
      setMachineLogs((prev) => [created, ...prev]);
      machineModal.close();
    } catch (e) {
      console.error("Failed to add machine usage log", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AddMachineUsageLogModal
        open={machineModal.isOpen}
        submitting={submitting}
        onCreate={createMachineLog}
        onClose={machineModal.close}
      />

      <SectionHeader
        title="Machine Usage Logs"
        subtitle="Track machine run time, output and downtime"
        action={
          <PrimaryButton type="button" onClick={() => machineModal.open()}>
            <Plus className="w-4 h-4" />
            Add Log
          </PrimaryButton>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Loader className="w-6 h-6 text-green-500 animate-spin" />
        </div>
      ) : (
        <TableShell
          columns={MACHINE_COLUMNS}
          isEmpty={machineLogs.length === 0}
          emptyMessage="No machine usage logs yet."
        >
          {machineLogs.map((l) => {
            const badge = MACHINE_STATUS_BADGE[l.status] ?? {
              label: String(l.status),
              className: "bg-gray-100 text-gray-600",
            };
            return (
              <tr key={l.id} className="border-t border-gray-100">
                <td className={cell}>{fmtDate(l.date)}</td>
                <td className={`${cell} font-medium text-gray-900`}>{l.machine}</td>
                <td className={cell}>{fmtText(l.operator)}</td>
                <td className={cell}>{fmtText(l.startTime)}</td>
                <td className={cell}>{fmtText(l.endTime)}</td>
                <td className={cell}>{fmtNumber(l.hoursUsed)}</td>
                <td className={cell}>{fmtNumber(l.outputKg)}</td>
                <td className={cell}>{fmtNumber(l.downtimeMins)}</td>
                <td className={cell}>
                  <Badge label={badge.label} className={badge.className} />
                </td>
                <td className={cell}>{fmtText(l.remarks)}</td>
              </tr>
            );
          })}
        </TableShell>
      )}
    </div>
  );
}
