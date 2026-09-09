"use client";

import { Plus } from "lucide-react";
import { APP_SALE_MODAL } from "@/lib/routes";
import { useOperationsModal } from "@/app/(main)/operations/_components/use-operations-modal";
import { fmtDate, fmtNaira, fmtNumber, fmtText, saleBalance, saleTotal } from "./types";
import { Badge, DeleteRowButton, PrimaryButton, SectionHeader, TableShell } from "./ui";
import { useSalesData } from "./use-sales-data";
import AddSaleModal from "./AddSaleModal";

const COLUMNS = [
  "Date",
  "Customer",
  "Quantity",
  "Price",
  "Total",
  "Paid",
  "Balance",
  "Mode of Payment",
  "Remarks",
  "",
];

const cell = "px-4 py-3 whitespace-nowrap text-gray-700";
const numCell = `${cell} text-right`;

export default function SalesRecordsTab() {
  const { sales, addSale, removeSale, submitting } = useSalesData();
  const modal = useOperationsModal(APP_SALE_MODAL);

  const handleCreate = async (record: Parameters<typeof addSale>[0]) => {
    await addSale(record);
    modal.close();
  };

  return (
    <div className="space-y-6">
      <AddSaleModal
        open={modal.isOpen}
        submitting={submitting}
        onCreate={handleCreate}
        onClose={modal.close}
      />

      <SectionHeader
        title="Sales"
        subtitle="Track egg sales transactions"
        action={
          <PrimaryButton type="button" onClick={() => modal.open()}>
            <Plus className="w-4 h-4" />
            Add Record
          </PrimaryButton>
        }
      />

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Sales Records</h3>
          <p className="text-sm text-gray-500 mt-0.5">All egg sales transactions</p>
        </div>

        <TableShell columns={COLUMNS} isEmpty={sales.length === 0} emptyMessage="No sales records yet.">
          {sales.map((s) => {
            const balance = saleBalance(s);
            return (
              <tr key={s.id} className="border-t border-gray-100">
                <td className={`${cell} font-medium text-gray-900`}>{fmtDate(s.date)}</td>
                <td className={cell}>{s.customer}</td>
                <td className={numCell}>{fmtNumber(s.quantity)}</td>
                <td className={numCell}>{fmtNaira(s.price)}</td>
                <td className={`${numCell} font-semibold text-green-700`}>
                  {fmtNaira(saleTotal(s))}
                </td>
                <td className={numCell}>{fmtNaira(s.paid)}</td>
                <td className={numCell}>
                  <Badge
                    label={fmtNaira(balance)}
                    className={
                      balance > 0 ? "bg-red-600 text-white" : "bg-green-100 text-green-700"
                    }
                  />
                </td>
                <td className={cell}>
                  <Badge
                    label={fmtText(s.modeOfPayment)}
                    className="border border-gray-200 bg-white text-gray-700"
                  />
                </td>
                <td className={cell}>{fmtText(s.remarks)}</td>
                <td className={`${cell} text-right`}>
                  <DeleteRowButton
                    label={`Delete sale to ${s.customer} on ${fmtDate(s.date)}`}
                    onDelete={() => removeSale(s.id)}
                  />
                </td>
              </tr>
            );
          })}
        </TableShell>
      </div>
    </div>
  );
}
