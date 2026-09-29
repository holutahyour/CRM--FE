"use client";

import { Plus } from "lucide-react";
import apiHandler from "@/data/api/ApiHandler";
import { APP_PRODUCT_MODAL } from "@/lib/routes";
import { fmtText } from "../types";
import { PrimaryButton, SectionHeader, TableShell } from "../ui";
import { useOperationsModal } from "../use-operations-modal";
import RecordModal, { FieldSpec } from "./RecordModal";
import RowActions from "./RowActions";
import { MOCK_PRODUCTS, ProcessingProduct } from "./types";
import { useRecordLog } from "./use-record-log";

const PRODUCT_API = {
  list: () => apiHandler.operations.listProducts(),
  create: (d: any) => apiHandler.operations.createProduct(d),
  update: (id: string, d: any) => apiHandler.operations.updateProduct(id, d),
  remove: (id: string) => apiHandler.operations.deleteProduct(id),
};

/** "PRODUCT IDENTIFICATION" + "PRODUCT DURATION". */
const FIELDS: FieldSpec[] = [
  { key: "name", label: "Product Name", kind: "text", required: true },
  { key: "productCode", label: "Product Code", kind: "text", placeholder: "e.g. SFL/002/GIG2/A10/0525/01" },
  { key: "upc", label: "UPC", kind: "text" },
  { key: "sku", label: "SKU", kind: "text" },
  { key: "rawMaterialId", label: "Raw Material ID", kind: "text" },
  { key: "processingDuration", label: "Processing Duration", kind: "text", placeholder: "e.g. 12Hrs" },
];

const COLUMNS = ["Product", "Product Code", "UPC", "SKU", "Raw Material ID", "Duration", ""];
const cell = "px-4 py-3 whitespace-nowrap text-gray-700";

const byName = (a: ProcessingProduct, b: ProcessingProduct) => a.name.localeCompare(b.name);

export default function ProductsSection() {
  const { rows, save, remove, submitting } = useRecordLog<ProcessingProduct>(PRODUCT_API, MOCK_PRODUCTS, byName);
  const modal = useOperationsModal(APP_PRODUCT_MODAL);
  const editingId = modal.value && modal.value !== "true" ? modal.value : null;
  const editing = editingId ? rows.find((p) => p.id === editingId) : undefined;

  return (
    <div className="space-y-6">
      <RecordModal
        open={modal.isOpen}
        title={editingId ? "Edit Product" : "Add Product"}
        subtitle="Product identification and processing duration"
        submitLabel="Save Product"
        fields={FIELDS}
        initial={editing}
        submitting={submitting}
        onSubmit={async (payload) => {
          await save(editingId, payload as Omit<ProcessingProduct, "id">);
          modal.close();
        }}
        onClose={modal.close}
      />

      <SectionHeader
        title="Products"
        subtitle="Product codes, identifiers and processing durations"
        action={
          <PrimaryButton type="button" onClick={() => modal.open()}>
            <Plus className="w-4 h-4" />
            Add Product
          </PrimaryButton>
        }
      />

      <TableShell columns={COLUMNS} isEmpty={rows.length === 0} emptyMessage="No products yet.">
        {rows.map((p) => (
          <tr key={p.id} className="border-t border-gray-100">
            <td className={`${cell} font-medium text-gray-900`}>{p.name}</td>
            <td className={cell}>{fmtText(p.productCode)}</td>
            <td className={cell}>{fmtText(p.upc)}</td>
            <td className={cell}>{fmtText(p.sku)}</td>
            <td className={cell}>{fmtText(p.rawMaterialId)}</td>
            <td className={cell}>{fmtText(p.processingDuration)}</td>
            <td className={cell}>
              <RowActions label={`product ${p.name}`} onEdit={() => modal.open(p.id)} onDelete={() => remove(p.id)} />
            </td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}
