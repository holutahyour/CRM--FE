"use client";

import { Plus } from "lucide-react";
import { APP_STOCK_MODAL } from "@/lib/routes";
import { useOperationsModal } from "@/app/(main)/operations/_components/use-operations-modal";
import { EGGS_PER_CRATE, closingCrates, closingEggs, fmtDate, fmtNumber } from "./types";
import { DeleteRowButton, PrimaryButton, SectionHeader, TableShell } from "./ui";
import { useSalesData } from "./use-sales-data";
import AddStockModal from "./AddStockModal";

const COLUMNS = [
  "Date",
  "Opening (eggs)",
  "Opening (crates)",
  "Produced",
  "Sold",
  "Sold (crates)",
  "Loss",
  "Loss (crates)",
  "Closing",
  "Closing (crates)",
  "",
];

const cell = "px-4 py-3 whitespace-nowrap text-gray-700";
const numCell = `${cell} text-right`;

export default function StockTab() {
  const { stock, addStock, removeStock, submitting } = useSalesData();
  const modal = useOperationsModal(APP_STOCK_MODAL);

  const handleCreate = async (record: Parameters<typeof addStock>[0]) => {
    await addStock(record);
    modal.close();
  };

  return (
    <div className="space-y-6">
      <AddStockModal
        open={modal.isOpen}
        submitting={submitting}
        onCreate={handleCreate}
        onClose={modal.close}
      />

      <SectionHeader
        title="Stock"
        subtitle="Daily egg stock movement"
        action={
          <PrimaryButton type="button" onClick={() => modal.open()}>
            <Plus className="w-4 h-4" />
            Add Record
          </PrimaryButton>
        }
      />

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Stock Records</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Daily egg inventory movement ({EGGS_PER_CRATE} eggs = 1 crate)
          </p>
        </div>

        <TableShell columns={COLUMNS} isEmpty={stock.length === 0} emptyMessage="No stock records yet.">
          {stock.map((s) => (
            <tr key={s.id} className="border-t border-gray-100">
              <td className={`${cell} font-medium text-gray-900`}>{fmtDate(s.date)}</td>
              <td className={numCell}>{fmtNumber(s.openingEggs)}</td>
              <td className={numCell}>{fmtNumber(s.openingCrates)}</td>
              <td className={`${numCell} text-green-700`}>{fmtNumber(s.produced)}</td>
              <td className={`${numCell} text-blue-600`}>{fmtNumber(s.sold)}</td>
              <td className={`${numCell} text-blue-600`}>{fmtNumber(s.soldCrates)}</td>
              <td className={`${numCell} text-red-600`}>{fmtNumber(s.loss)}</td>
              <td className={`${numCell} text-red-600`}>{fmtNumber(s.lossCrates)}</td>
              <td className={`${numCell} font-semibold text-gray-900`}>
                {fmtNumber(closingEggs(s))}
              </td>
              <td className={`${numCell} font-semibold text-gray-900`}>
                {fmtNumber(closingCrates(s))}
              </td>
              <td className={`${cell} text-right`}>
                <DeleteRowButton
                  label={`Delete stock record for ${fmtDate(s.date)}`}
                  onDelete={() => removeStock(s.id)}
                />
              </td>
            </tr>
          ))}
        </TableShell>
      </div>
    </div>
  );
}
