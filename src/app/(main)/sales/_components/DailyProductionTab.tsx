"use client";

import { Plus } from "lucide-react";
import { APP_PRODUCTION_MODAL } from "@/lib/routes";
import { useOperationsModal } from "@/app/(main)/operations/_components/use-operations-modal";
import { fmtDate, fmtNumber, goodEggs, totalLoss } from "./types";
import { Badge, DeleteRowButton, PrimaryButton, SectionHeader, TableShell } from "./ui";
import { useSalesData } from "./use-sales-data";
import AddProductionModal from "./AddProductionModal";

const COLUMNS = [
  "Date",
  "Opening Birds",
  "Eggs (Morning)",
  "Total Eggs",
  "Total Eggs (Crates)",
  "Cracked",
  "Bad",
  "Total Loss",
  "Small Eggs",
  "Good Eggs",
  "",
];

const cell = "px-4 py-3 whitespace-nowrap text-gray-700";
const numCell = `${cell} text-right`;

export default function DailyProductionTab() {
  const { production, addProduction, removeProduction, submitting } = useSalesData();
  const modal = useOperationsModal(APP_PRODUCTION_MODAL);

  const handleCreate = async (record: Parameters<typeof addProduction>[0]) => {
    await addProduction(record);
    modal.close();
  };

  return (
    <div className="space-y-6">
      <AddProductionModal
        open={modal.isOpen}
        submitting={submitting}
        onCreate={handleCreate}
        onClose={modal.close}
      />

      <SectionHeader
        title="Daily Production"
        subtitle="Track daily egg production data"
        action={
          <PrimaryButton type="button" onClick={() => modal.open()}>
            <Plus className="w-4 h-4" />
            Add Record
          </PrimaryButton>
        }
      />

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Production Records</h3>
          <p className="text-sm text-gray-500 mt-0.5">Daily egg production log</p>
        </div>

        <TableShell
          columns={COLUMNS}
          isEmpty={production.length === 0}
          emptyMessage="No production records yet."
        >
          {production.map((p) => (
            <tr key={p.id} className="border-t border-gray-100">
              <td className={`${cell} font-medium text-gray-900`}>{fmtDate(p.date)}</td>
              <td className={numCell}>{fmtNumber(p.openingBirds)}</td>
              <td className={numCell}>{fmtNumber(p.eggsMorning)}</td>
              <td className={numCell}>{fmtNumber(p.totalEggs)}</td>
              <td className={numCell}>{fmtNumber(p.totalEggsCrates)}</td>
              <td className={numCell}>{fmtNumber(p.cracked)}</td>
              <td className={`${numCell} text-amber-600`}>{fmtNumber(p.bad)}</td>
              <td className={numCell}>
                <Badge label={fmtNumber(totalLoss(p))} className="bg-red-600 text-white" />
              </td>
              <td className={numCell}>{fmtNumber(p.smallEggs)}</td>
              <td className={numCell}>
                <Badge label={fmtNumber(goodEggs(p))} className="bg-green-100 text-green-700" />
              </td>
              <td className={`${cell} text-right`}>
                <DeleteRowButton
                  label={`Delete production record for ${fmtDate(p.date)}`}
                  onDelete={() => removeProduction(p.id)}
                />
              </td>
            </tr>
          ))}
        </TableShell>
      </div>
    </div>
  );
}
