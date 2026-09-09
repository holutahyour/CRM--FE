"use client";

import { Plus } from "lucide-react";
import { APP_FEED_COST_MODAL } from "@/lib/routes";
import { useOperationsModal } from "@/app/(main)/operations/_components/use-operations-modal";
import { feedTotal, fmtDate, fmtNaira, fmtNumber } from "./types";
import { DeleteRowButton, PrimaryButton, SectionHeader, TableShell } from "./ui";
import { useSalesData } from "./use-sales-data";
import AddFeedCostModal from "./AddFeedCostModal";

const COLUMNS = ["Date", "Feed Type", "Quantity (bags)", "Cost per Bag", "Total Cost", ""];

const cell = "px-4 py-3 whitespace-nowrap text-gray-700";
const numCell = `${cell} text-right`;

export default function FeedCostTab() {
  const { feedCosts, addFeedCost, removeFeedCost, submitting } = useSalesData();
  const modal = useOperationsModal(APP_FEED_COST_MODAL);

  const handleCreate = async (record: Parameters<typeof addFeedCost>[0]) => {
    await addFeedCost(record);
    modal.close();
  };

  return (
    <div className="space-y-6">
      <AddFeedCostModal
        open={modal.isOpen}
        submitting={submitting}
        onCreate={handleCreate}
        onClose={modal.close}
      />

      <SectionHeader
        title="Feed Cost"
        subtitle="Track feed purchases and costs"
        action={
          <PrimaryButton type="button" onClick={() => modal.open()}>
            <Plus className="w-4 h-4" />
            Add Record
          </PrimaryButton>
        }
      />

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Feed Cost Records</h3>
          <p className="text-sm text-gray-500 mt-0.5">All feed purchase records</p>
        </div>

        <TableShell
          columns={COLUMNS}
          isEmpty={feedCosts.length === 0}
          emptyMessage="No feed cost records yet."
        >
          {feedCosts.map((f) => (
            <tr key={f.id} className="border-t border-gray-100">
              <td className={`${cell} font-medium text-gray-900`}>{fmtDate(f.date)}</td>
              <td className={cell}>{f.feedType}</td>
              <td className={numCell}>{fmtNumber(f.quantity)}</td>
              <td className={numCell}>{fmtNaira(f.costPerBag)}</td>
              <td className={`${numCell} font-semibold text-green-700`}>
                {fmtNaira(feedTotal(f))}
              </td>
              <td className={`${cell} text-right`}>
                <DeleteRowButton
                  label={`Delete ${f.feedType} purchase on ${fmtDate(f.date)}`}
                  onDelete={() => removeFeedCost(f.id)}
                />
              </td>
            </tr>
          ))}
        </TableShell>
      </div>
    </div>
  );
}
