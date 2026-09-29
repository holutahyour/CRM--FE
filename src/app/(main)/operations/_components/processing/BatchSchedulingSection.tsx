"use client";

import { Plus } from "lucide-react";
import apiHandler from "@/data/api/ApiHandler";
import { APP_BATCH_MODAL } from "@/lib/routes";
import { fmtDate, fmtNumber, fmtText } from "../types";
import { Badge, PrimaryButton, SectionHeader, TableShell } from "../ui";
import { useOperationsModal } from "../use-operations-modal";
import RecordModal, { FieldSpec, dateOrderRule } from "./RecordModal";
import RowActions from "./RowActions";
import {
  MOCK_BATCHES,
  MOCK_ORDER_REQUESTS,
  MOCK_PRODUCTS,
  OrderRequest,
  PROCESSING_STATUS_OPTIONS,
  ProcessingProduct,
  ProductionBatch,
  processingStatusBadge,
} from "./types";
import { byDateDesc, useRecordLog } from "./use-record-log";

const BATCH_API = {
  list: () => apiHandler.operations.listBatches(),
  create: (d: any) => apiHandler.operations.createBatch(d),
  update: (id: string, d: any) => apiHandler.operations.updateBatch(id, d),
  remove: (id: string) => apiHandler.operations.deleteBatch(id),
};
const ORDER_API = { list: () => apiHandler.operations.listOrderRequests() };
const PRODUCT_API = { list: () => apiHandler.operations.listProducts() };

const COLUMNS = [
  "Batch ID",
  "Customer",
  "Products",
  "Product Code",
  "Qty",
  "Start",
  "End",
  "Work Center(s)",
  "Operator(s)",
  "Status",
  "QC",
  "Dispatch",
  "",
];

const cell = "px-4 py-3 whitespace-nowrap text-gray-700 align-top";
const multiline = "px-4 py-3 whitespace-pre-line text-gray-700 align-top min-w-[12rem]";

/** The "Batch Production Schedule" sheet, column for column. */
function batchFields(orders: OrderRequest[], products: ProcessingProduct[]): FieldSpec[] {
  return [
    { key: "batchCode", label: "Batch ID", kind: "text", placeholder: "e.g. HI925001" },
    { key: "status", label: "Status", kind: "select", options: PROCESSING_STATUS_OPTIONS },
    { key: "productNames", label: "Product Names", kind: "textarea", required: true, wide: true,
      placeholder: "One product per line" },
    { key: "productId", label: "Product", kind: "select", emptyLabel: "— Not a listed product —",
      options: products.map((p) => ({ value: p.id, label: p.name })) },
    { key: "productCode", label: "Product Code", kind: "text", placeholder: "e.g. SFL/001/HIG3/0925/001" },
    { key: "orderRequestId", label: "Order Request", kind: "select", emptyLabel: "— None —",
      options: orders.map((o) => ({ value: o.id, label: `${fmtDate(o.requestDate)} · ${o.customerName}` })) },
    { key: "rawMaterialBatchId", label: "Raw Material Batch ID", kind: "text" },
    { key: "customerCode", label: "Customer ID", kind: "text", placeholder: "e.g. CUS-00529" },
    { key: "customerName", label: "Customer Name", kind: "text" },
    { key: "quantity", label: "Quantity", kind: "number" },
    { key: "quantityUnit", label: "Unit", kind: "text", placeholder: "kg, g, bags, pcs…" },
    { key: "quantityNotes", label: "Quantity Notes", kind: "textarea", wide: true,
      placeholder: "Per-product breakdown, e.g. 40g - 200pcs" },
    { key: "startDate", label: "Start Date", kind: "date" },
    { key: "endDate", label: "End Date", kind: "date" },
    { key: "leadTime", label: "Lead Time", kind: "text", placeholder: "e.g. 11 hours" },
    { key: "workCenters", label: "Work Center(s)", kind: "text", placeholder: "e.g. Packaging Area" },
    { key: "operators", label: "Operator(s)", kind: "text" },
    { key: "qualityChecks", label: "Quality Checks", kind: "text" },
    { key: "taskDescription", label: "Task Description", kind: "textarea", wide: true },
    { key: "dateSent", label: "Date Sent", kind: "date" },
    { key: "quantitySent", label: "Quantity Sent", kind: "text" },
    { key: "logisticsPersonnel", label: "Logistics Personnel", kind: "text" },
    { key: "deliveryStatus", label: "Delivery Status", kind: "text", placeholder: "Sent, Delivered, Pick Up…" },
    { key: "onTimeDeliveryPercent", label: "On-Time Delivery %", kind: "number", max: 100 },
  ];
}

const validate = dateOrderRule("startDate", "endDate", "End date must be on or after the start date");

export default function BatchSchedulingSection() {
  const { rows, save, remove, submitting } = useRecordLog<ProductionBatch>(
    BATCH_API,
    MOCK_BATCHES,
    byDateDesc<ProductionBatch>("startDate")
  );
  const { rows: orders } = useRecordLog<OrderRequest>(ORDER_API, MOCK_ORDER_REQUESTS);
  const { rows: products } = useRecordLog<ProcessingProduct>(PRODUCT_API, MOCK_PRODUCTS);
  const modal = useOperationsModal(APP_BATCH_MODAL);

  const editingId = modal.value && modal.value !== "true" ? modal.value : null;
  const editing = editingId ? rows.find((b) => b.id === editingId) : undefined;
  const label = (b: ProductionBatch) => `batch ${b.batchCode || b.productNames.split("\n")[0]}`;

  return (
    <div className="space-y-6">
      <RecordModal
        open={modal.isOpen}
        title={editingId ? "Edit Batch" : "Add Batch"}
        subtitle="Batch Production Schedule"
        submitLabel="Save Batch"
        fields={batchFields(orders, products)}
        initial={editing}
        validate={validate}
        submitting={submitting}
        onSubmit={async (payload) => {
          await save(editingId, payload as Omit<ProductionBatch, "id">);
          modal.close();
        }}
        onClose={modal.close}
      />

      <SectionHeader
        title="Batch Scheduling"
        subtitle="Production jobs from raw material through processing to dispatch"
        action={
          <PrimaryButton type="button" onClick={() => modal.open()}>
            <Plus className="w-4 h-4" />
            Add Batch
          </PrimaryButton>
        }
      />

      <TableShell columns={COLUMNS} isEmpty={rows.length === 0} emptyMessage="No batches scheduled yet.">
        {rows.map((b) => {
          const badge = processingStatusBadge(b.status);
          return (
            <tr key={b.id} className="border-t border-gray-100">
              <td className={`${cell} font-medium text-gray-900`}>{fmtText(b.batchCode)}</td>
              <td className={cell}>
                <div>{fmtText(b.customerName)}</div>
                {b.customerCode && <div className="text-xs text-gray-400">{b.customerCode}</div>}
              </td>
              <td className={multiline}>{b.productNames}</td>
              <td className={multiline}>{fmtText(b.productCode)}</td>
              <td className={cell}>
                {b.quantity != null ? `${fmtNumber(b.quantity)} ${b.quantityUnit ?? ""}`.trim() : "—"}
                {b.quantityNotes && <div className="text-xs text-gray-400 whitespace-pre-line">{b.quantityNotes}</div>}
              </td>
              <td className={cell}>{fmtDate(b.startDate ?? undefined)}</td>
              <td className={cell}>{fmtDate(b.endDate ?? undefined)}</td>
              <td className={multiline}>{fmtText(b.workCenters)}</td>
              <td className={cell}>{fmtText(b.operators)}</td>
              <td className={cell}>
                <Badge label={badge.label} className={badge.className} />
              </td>
              <td className={cell}>{fmtText(b.qualityChecks)}</td>
              <td className={cell}>
                {b.dateSent || b.deliveryStatus || b.logisticsPersonnel ? (
                  <>
                    <div>{fmtText(b.deliveryStatus)}</div>
                    <div className="text-xs text-gray-400">
                      {[fmtDate(b.dateSent ?? undefined), b.logisticsPersonnel].filter((x) => x && x !== "—").join(" · ")}
                    </div>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className={cell}>
                <RowActions label={label(b)} onEdit={() => modal.open(b.id)} onDelete={() => remove(b.id)} />
              </td>
            </tr>
          );
        })}
      </TableShell>
    </div>
  );
}
