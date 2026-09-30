"use client";

import { Plus } from "lucide-react";
import { APP_PRODUCE_SALE_MODAL } from "@/lib/routes";
import { useOperationsModal } from "@/app/(main)/operations/_components/use-operations-modal";
import { produceSaleBalance, produceSaleTotal } from "./produce-types";
import { fmtDate, fmtNaira, fmtNumber, fmtText } from "./types";
import { Badge, Card, DeleteRowButton, PrimaryButton, SectionHeader, TableShell } from "./ui";
import { useProduceData } from "./use-produce-data";
import AddProduceSaleModal from "./AddProduceSaleModal";

const COLUMNS = [
  "Date",
  "Customer",
  "Location",
  "Produce Type",
  "Grade",
  "Qty (kg)",
  "Price/kg",
  "Total (₦)",
  "Paid (₦)",
  "Balance (₦)",
  "Remarks",
  "Category",
  "Payment Status",
  "",
];

const cell = "px-4 py-3 whitespace-nowrap text-gray-700";
const numCell = `${cell} text-right`;

const STATUS_STYLES: Record<string, string> = {
  "Fully Paid": "bg-green-100 text-green-700",
  Outstanding: "bg-amber-100 text-amber-700",
};

export default function ProduceSalesTab() {
  const { sales, addSale, removeSale, submitting } = useProduceData();
  const modal = useOperationsModal(APP_PRODUCE_SALE_MODAL);

  const handleCreate = async (record: Parameters<typeof addSale>[0]) => {
    await addSale(record);
    modal.close();
  };

  return (
    <div className="space-y-6">
      <AddProduceSaleModal
        open={modal.isOpen}
        submitting={submitting}
        onCreate={handleCreate}
        onClose={modal.close}
      />

      <SectionHeader
        title="Sales"
        subtitle="Track fresh produce sales transactions"
        action={
          <PrimaryButton type="button" onClick={() => modal.open()}>
            <Plus className="w-4 h-4" />
            Add Record
          </PrimaryButton>
        }
      />

      <Card title="Fresh Produce Sales Records" subtitle="All produce sales transactions">
        <TableShell columns={COLUMNS} isEmpty={sales.length === 0} emptyMessage="No produce sales yet.">
          {sales.map((s) => {
            const balance = produceSaleBalance(s);
            return (
              <tr key={s.id} className="border-t border-gray-100">
                <td className={`${cell} font-medium text-gray-900`}>{fmtDate(s.date)}</td>
                <td className={cell}>{s.customer}</td>
                <td className={cell}>{fmtText(s.location)}</td>
                <td className={cell}>{fmtText(s.produceType)}</td>
                <td className={cell}>
                  {s.grade ? (
                    <Badge label={s.grade} className="border border-gray-200 bg-white text-gray-700" />
                  ) : (
                    "—"
                  )}
                </td>
                <td className={numCell}>{fmtNumber(s.quantity)}</td>
                <td className={numCell}>{fmtNaira(s.pricePerKg)}</td>
                <td className={`${numCell} font-semibold text-green-700`}>
                  {fmtNaira(produceSaleTotal(s))}
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
                <td className={cell}>{s.category}</td>
                <td className={cell}>
                  <Badge
                    label={fmtText(s.paymentStatus)}
                    className={STATUS_STYLES[s.paymentStatus] ?? "bg-gray-100 text-gray-700"}
                  />
                </td>
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
      </Card>
    </div>
  );
}
