"use client";

import { Plus } from "lucide-react";
import { APP_PACKHOUSE_INTAKE_MODAL } from "@/lib/routes";
import { useOperationsModal } from "@/app/(main)/operations/_components/use-operations-modal";
import { intakeAccepted } from "./produce-types";
import { fmtDate, fmtNumber, fmtText } from "./types";
import { Card, DeleteRowButton, PrimaryButton, SectionHeader, TableShell } from "./ui";
import { useProduceData } from "./use-produce-data";
import AddPackhouseIntakeModal from "./AddPackhouseIntakeModal";

const COLUMNS = [
  "Date",
  "Produce Type",
  "Grade A (kg)",
  "Grade B (kg)",
  "Grade C (kg)",
  "Accepted (kg)",
  "Rejected (kg)",
  "Harvested (kg)",
  "Remarks",
  "",
];

const cell = "px-4 py-3 whitespace-nowrap text-gray-700";
const numCell = `${cell} text-right`;

export default function PackhouseIntakeTab() {
  const { intake, addIntake, removeIntake, submitting } = useProduceData();
  const modal = useOperationsModal(APP_PACKHOUSE_INTAKE_MODAL);

  const handleCreate = async (record: Parameters<typeof addIntake>[0]) => {
    await addIntake(record);
    modal.close();
  };

  return (
    <div className="space-y-6">
      <AddPackhouseIntakeModal
        open={modal.isOpen}
        submitting={submitting}
        onCreate={handleCreate}
        onClose={modal.close}
      />

      <SectionHeader
        title="Packhouse Intake"
        subtitle="Record produce received and graded at the packhouse"
        action={
          <PrimaryButton type="button" onClick={() => modal.open()}>
            <Plus className="w-4 h-4" />
            Add Record
          </PrimaryButton>
        }
      />

      <Card title="Packhouse Intake Records" subtitle="Daily intake and grading log">
        <TableShell
          columns={COLUMNS}
          isEmpty={intake.length === 0}
          emptyMessage="No packhouse intake records yet."
        >
          {intake.map((i) => (
            <tr key={i.id} className="border-t border-gray-100">
              <td className={`${cell} font-medium text-gray-900`}>{fmtDate(i.date)}</td>
              <td className={cell}>{i.produceType}</td>
              <td className={numCell}>{fmtNumber(i.gradeA)}</td>
              <td className={numCell}>{fmtNumber(i.gradeB)}</td>
              <td className={numCell}>{fmtNumber(i.gradeC)}</td>
              <td className={`${numCell} font-semibold text-green-700`}>
                {fmtNumber(intakeAccepted(i))}
              </td>
              <td className={`${numCell} text-red-600`}>{fmtNumber(i.rejected)}</td>
              <td className={numCell}>{fmtNumber(i.quantityHarvested)}</td>
              <td className={cell}>{fmtText(i.remarks)}</td>
              <td className={`${cell} text-right`}>
                <DeleteRowButton
                  label={`Delete ${i.produceType} intake on ${fmtDate(i.date)}`}
                  onDelete={() => removeIntake(i.id)}
                />
              </td>
            </tr>
          ))}
        </TableShell>
      </Card>
    </div>
  );
}
