"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import apiHandler from "@/data/api/ApiHandler";
import { APP_YIELD_ENTRY_MODAL } from "@/lib/routes";
import { fmtDate, fmtNumber, fmtText } from "../types";
import { PrimaryButton, SectionHeader, SelectInput, TableShell } from "../ui";
import { useOperationsModal } from "../use-operations-modal";
import RecordModal, { FieldSpec } from "./RecordModal";
import RowActions from "./RowActions";
import {
  MOCK_BATCHES,
  MOCK_STOCK_CARDS,
  MOCK_YIELD_ENTRIES,
  ProductionBatch,
  RAW_PRODUCE_CATEGORY,
  StockCardItem,
  YieldEntry,
  fmtPercent,
  wastePercent,
  yieldPercent,
} from "./types";
import { byDateDesc, useRecordLog } from "./use-record-log";

const YIELD_API = {
  list: () => apiHandler.operations.listYieldEntries(),
  create: (d: any) => apiHandler.operations.createYieldEntry(d),
  update: (id: string, d: any) => apiHandler.operations.updateYieldEntry(id, d),
  remove: (id: string) => apiHandler.operations.deleteYieldEntry(id),
};
const STOCK_API = { list: () => apiHandler.operations.listStockCards() };
const BATCH_API = { list: () => apiHandler.operations.listBatches() };

/**
 * The "PROCESSING ACTIVITIES" sheet had one block of columns per produce; here every run
 * is one row with the produce as a field, and each stage weight is optional because each
 * produce skips different stages.
 */
function yieldFields(produce: StockCardItem[], batches: ProductionBatch[]): FieldSpec[] {
  return [
    { key: "date", label: "Date", kind: "date", required: true },
    { key: "produceItemId", label: "Produce", kind: "select", required: true, emptyLabel: "— Select produce —",
      options: produce.map((p) => ({ value: p.id, label: p.name })) },
    { key: "shift", label: "Shift", kind: "select", emptyLabel: "—",
      options: [{ value: "Day", label: "Day" }, { value: "Night", label: "Night" }] },
    { key: "productionBatchId", label: "Production Batch", kind: "select", emptyLabel: "— None —",
      options: batches.map((b) => ({ value: b.id, label: [b.batchCode, b.productNames.split("\n")[0]].filter(Boolean).join(" · ") })) },
    { key: "inputQuantity", label: "Input Quantity", kind: "number" },
    { key: "inputUnit", label: "Input Unit", kind: "text", placeholder: "kg, bags, crates" },
    { key: "inputWeightKg", label: "Input Weight (kg)", kind: "number", placeholder: "When counted in bags/crates" },
    { key: "cutWeightKg", label: "Cut Weight (kg)", kind: "number" },
    { key: "dehydratedWeightKg", label: "Dehydrated Weight (kg)", kind: "number" },
    { key: "grindWeightKg", label: "Grind Weight (kg)", kind: "number" },
    { key: "secondGrindWeightKg", label: "Second Grind (kg)", kind: "number" },
    { key: "wasteKg", label: "Waste (kg)", kind: "number" },
    { key: "notes", label: "Notes", kind: "textarea", wide: true },
  ];
}

const COLUMNS = ["Date", "Produce", "Shift", "Input", "Cut (kg)", "Dehydrated (kg)", "Grind (kg)", "2nd Grind (kg)", "Waste (kg)", "Yield", "Waste %", ""];
const cell = "px-4 py-3 whitespace-nowrap text-gray-700";
const numCell = `${cell} text-right`;

const NEW_ENTRY_DEFAULTS = { inputUnit: "kg" };
const fmtKg = (n?: number | null) => (n == null ? "—" : fmtNumber(n));

export default function YieldLogSection() {
  const { rows, save, remove, submitting } = useRecordLog<YieldEntry>(
    YIELD_API,
    MOCK_YIELD_ENTRIES,
    byDateDesc<YieldEntry>("date")
  );
  const { rows: stock } = useRecordLog<StockCardItem>(STOCK_API, MOCK_STOCK_CARDS);
  const { rows: batches } = useRecordLog<ProductionBatch>(BATCH_API, MOCK_BATCHES);
  const modal = useOperationsModal(APP_YIELD_ENTRY_MODAL);
  const [produceFilter, setProduceFilter] = useState("");

  const produce = useMemo(
    () => stock.filter((i) => i.categoryName === RAW_PRODUCE_CATEGORY).sort((a, b) => a.name.localeCompare(b.name)),
    [stock]
  );
  const nameOf = useMemo(() => new Map(stock.map((i) => [i.id, i.name])), [stock]);
  const visible = produceFilter ? rows.filter((r) => r.produceItemId === produceFilter) : rows;

  const editingId = modal.value && modal.value !== "true" ? modal.value : null;
  const editing = editingId ? rows.find((y) => y.id === editingId) : NEW_ENTRY_DEFAULTS;

  return (
    <div className="space-y-6">
      <RecordModal
        open={modal.isOpen}
        title={editingId ? "Edit Yield Entry" : "Add Yield Entry"}
        subtitle="One processing run of one produce"
        submitLabel="Save Yield Entry"
        fields={yieldFields(produce, batches)}
        initial={editing}
        submitting={submitting}
        onSubmit={async (payload) => {
          await save(editingId, payload as Omit<YieldEntry, "id">);
          modal.close();
        }}
        onClose={modal.close}
      />

      <SectionHeader
        title="Yield Log"
        subtitle="Input, stage weights and waste for each processing run"
        action={
          <PrimaryButton type="button" onClick={() => modal.open()}>
            <Plus className="w-4 h-4" />
            Add Yield Entry
          </PrimaryButton>
        }
      />

      <div className="flex items-center gap-3">
        <label htmlFor="yield-produce-filter" className="text-sm font-medium text-gray-700">
          Produce
        </label>
        <SelectInput
          id="yield-produce-filter"
          className="max-w-xs"
          value={produceFilter}
          onChange={(e) => setProduceFilter(e.target.value)}
        >
          <option value="">All produce</option>
          {produce.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectInput>
      </div>

      <TableShell columns={COLUMNS} isEmpty={visible.length === 0} emptyMessage="No yield entries yet.">
        {visible.map((y) => {
          const produceName = nameOf.get(y.produceItemId) ?? "Unknown produce";
          const input = [
            y.inputQuantity != null ? `${fmtNumber(y.inputQuantity)} ${y.inputUnit ?? ""}`.trim() : null,
            y.inputWeightKg != null ? `(${fmtNumber(y.inputWeightKg)} kg)` : null,
          ].filter(Boolean).join(" ");
          return (
            <tr key={y.id} className="border-t border-gray-100">
              <td className={`${cell} font-medium text-gray-900`}>{fmtDate(y.date)}</td>
              <td className={cell}>{produceName}</td>
              <td className={cell}>{fmtText(y.shift)}</td>
              <td className={cell}>{input || "—"}</td>
              <td className={numCell}>{fmtKg(y.cutWeightKg)}</td>
              <td className={numCell}>{fmtKg(y.dehydratedWeightKg)}</td>
              <td className={numCell}>{fmtKg(y.grindWeightKg)}</td>
              <td className={numCell}>{fmtKg(y.secondGrindWeightKg)}</td>
              <td className={numCell}>{fmtKg(y.wasteKg)}</td>
              <td className={`${numCell} font-semibold text-green-700`}>{fmtPercent(yieldPercent(y))}</td>
              <td className={numCell}>{fmtPercent(wastePercent(y))}</td>
              <td className={cell}>
                <RowActions
                  label={`${produceName} run on ${fmtDate(y.date)}`}
                  onEdit={() => modal.open(y.id)}
                  onDelete={() => remove(y.id)}
                />
              </td>
            </tr>
          );
        })}
      </TableShell>
    </div>
  );
}
