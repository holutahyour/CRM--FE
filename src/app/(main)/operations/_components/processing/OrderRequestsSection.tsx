"use client";

import { Plus } from "lucide-react";
import apiHandler from "@/data/api/ApiHandler";
import { APP_ORDER_REQUEST_MODAL } from "@/lib/routes";
import { fmtDate, fmtText } from "../types";
import { Badge, PrimaryButton, SectionHeader, TableShell } from "../ui";
import { useOperationsModal } from "../use-operations-modal";
import RecordModal, { FieldSpec, dateOrderRule } from "./RecordModal";
import RowActions from "./RowActions";
import { MOCK_ORDER_REQUESTS, OrderRequest, PROCESSING_STATUS_OPTIONS, processingStatusBadge } from "./types";
import { byDateDesc, useRecordLog } from "./use-record-log";

const ORDER_API = {
  list: () => apiHandler.operations.listOrderRequests(),
  create: (d: any) => apiHandler.operations.createOrderRequest(d),
  update: (id: string, d: any) => apiHandler.operations.updateOrderRequest(id, d),
  remove: (id: string) => apiHandler.operations.deleteOrderRequest(id),
};

/** The "ORDER REQUEST SHEET", column for column. */
const FIELDS: FieldSpec[] = [
  { key: "requestDate", label: "Request Date", kind: "date", required: true },
  { key: "status", label: "Status", kind: "select", options: PROCESSING_STATUS_OPTIONS },
  { key: "customerCode", label: "Customer ID", kind: "text", placeholder: "e.g. CUS-00529" },
  { key: "customerName", label: "Customer Name", kind: "text", required: true },
  { key: "products", label: "Products", kind: "textarea", required: true, wide: true,
    placeholder: "One product per line, e.g. 7 bottles turmeric (120g)" },
  { key: "activitiesRequired", label: "Activities Required", kind: "textarea", wide: true,
    placeholder: "e.g. Dehydration and grinding" },
  { key: "volumeRequired", label: "Volume Required", kind: "text", placeholder: "e.g. 300kg" },
  { key: "productBatchNumber", label: "Product Batch Number", kind: "text" },
  { key: "deliveryDate", label: "Delivery Date", kind: "date" },
  { key: "deliveryLocation", label: "Delivery Location", kind: "text" },
  { key: "startDate", label: "Start Date", kind: "date" },
  { key: "dueDate", label: "Due Date", kind: "date" },
  { key: "duration", label: "Duration", kind: "text", placeholder: "e.g. 3 days" },
];

const COLUMNS = ["Request Date", "Customer", "Products", "Activities", "Volume", "Delivery", "Batch No.", "Status", "Start", "Due", ""];

const cell = "px-4 py-3 whitespace-nowrap text-gray-700 align-top";
const multiline = "px-4 py-3 whitespace-pre-line text-gray-700 align-top min-w-[12rem]";

const validate = dateOrderRule("startDate", "dueDate", "Due date must be on or after the start date");

export default function OrderRequestsSection() {
  const { rows, save, remove, submitting } = useRecordLog<OrderRequest>(
    ORDER_API,
    MOCK_ORDER_REQUESTS,
    byDateDesc<OrderRequest>("requestDate")
  );
  const modal = useOperationsModal(APP_ORDER_REQUEST_MODAL);
  const editingId = modal.value && modal.value !== "true" ? modal.value : null;
  const editing = editingId ? rows.find((o) => o.id === editingId) : undefined;

  return (
    <div className="space-y-6">
      <RecordModal
        open={modal.isOpen}
        title={editingId ? "Edit Order Request" : "Add Order Request"}
        subtitle="Customer request for processing work"
        submitLabel="Save Order Request"
        fields={FIELDS}
        initial={editing}
        validate={validate}
        submitting={submitting}
        onSubmit={async (payload) => {
          await save(editingId, payload as Omit<OrderRequest, "id">);
          modal.close();
        }}
        onClose={modal.close}
      />

      <SectionHeader
        title="Order Requests"
        subtitle="Customer requests awaiting or in production"
        action={
          <PrimaryButton type="button" onClick={() => modal.open()}>
            <Plus className="w-4 h-4" />
            Add Order Request
          </PrimaryButton>
        }
      />

      <TableShell columns={COLUMNS} isEmpty={rows.length === 0} emptyMessage="No order requests yet.">
        {rows.map((o) => {
          const badge = processingStatusBadge(o.status);
          return (
            <tr key={o.id} className="border-t border-gray-100">
              <td className={`${cell} font-medium text-gray-900`}>{fmtDate(o.requestDate)}</td>
              <td className={cell}>
                <div>{o.customerName}</div>
                {o.customerCode && <div className="text-xs text-gray-400">{o.customerCode}</div>}
              </td>
              <td className={multiline}>{o.products}</td>
              <td className={multiline}>{fmtText(o.activitiesRequired)}</td>
              <td className={multiline}>{fmtText(o.volumeRequired)}</td>
              <td className={cell}>
                <div>{fmtDate(o.deliveryDate ?? undefined)}</div>
                {o.deliveryLocation && <div className="text-xs text-gray-400">{o.deliveryLocation}</div>}
              </td>
              <td className={cell}>{fmtText(o.productBatchNumber)}</td>
              <td className={cell}>
                <Badge label={badge.label} className={badge.className} />
              </td>
              <td className={cell}>{fmtDate(o.startDate ?? undefined)}</td>
              <td className={cell}>{fmtDate(o.dueDate ?? undefined)}</td>
              <td className={cell}>
                <RowActions
                  label={`order request from ${o.customerName} on ${fmtDate(o.requestDate)}`}
                  onEdit={() => modal.open(o.id)}
                  onDelete={() => remove(o.id)}
                />
              </td>
            </tr>
          );
        })}
      </TableShell>
    </div>
  );
}
