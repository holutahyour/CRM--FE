// ── Operations → Processing ──────────────────────────────────────────────────
// Record shapes for the Batch Production Scheduling workbook. Property names are
// the API's JSON (CRM---BE OperationsDTO.cs); dates travel as "YYYY-MM-DD".

/** The "Dropdown keys" sheet's STATUS list. The API sends the enum name. */
export type ProcessingStatus =
  | "NotStarted"
  | "InProgress"
  | "Complete"
  | "OnHold"
  | "Overdue"
  | "NeedsReview"
  | "NeedsUpdate";

export interface ProcessingProduct {
  id: string;
  name: string;
  productCode?: string | null;
  upc?: string | null;
  sku?: string | null;
  rawMaterialId?: string | null;
  processingDuration?: string | null;
}

export interface OrderRequest {
  id: string;
  requestDate: string;
  customerCode?: string | null;
  customerName: string;
  products: string;
  activitiesRequired?: string | null;
  volumeRequired?: string | null;
  deliveryDate?: string | null;
  deliveryLocation?: string | null;
  productBatchNumber?: string | null;
  status: ProcessingStatus | string;
  startDate?: string | null;
  dueDate?: string | null;
  duration?: string | null;
}

export interface ProductionBatch {
  id: string;
  orderRequestId?: string | null;
  productId?: string | null;
  rawMaterialBatchId?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  batchCode?: string | null;
  productNames: string;
  productCode?: string | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  quantityNotes?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  leadTime?: string | null;
  workCenters?: string | null;
  operators?: string | null;
  taskDescription?: string | null;
  status: ProcessingStatus | string;
  qualityChecks?: string | null;
  dateSent?: string | null;
  quantitySent?: string | null;
  logisticsPersonnel?: string | null;
  deliveryStatus?: string | null;
  onTimeDeliveryPercent?: number | null;
}

export interface YieldWeights {
  inputQuantity?: number | null;
  inputUnit?: string | null;
  inputWeightKg?: number | null;
  cutWeightKg?: number | null;
  dehydratedWeightKg?: number | null;
  grindWeightKg?: number | null;
  secondGrindWeightKg?: number | null;
  wasteKg?: number | null;
}

export interface YieldEntry extends YieldWeights {
  id: string;
  date: string;
  produceItemId: string;
  productionBatchId?: string | null;
  shift?: string | null;
  notes?: string | null;
}

/** A material on the Material Stock overview (an Inventory item in a Processing category). */
export interface StockCardItem {
  id: string;
  name: string;
  sku: string;
  categoryName?: string | null;
  unitType: string;
  locationName?: string | null;
  quantityOnHand: number;
}

export interface StockCardRow {
  transactionId: string;
  date: string;
  opening: number;
  received: number;
  issued: number;
  closing: number;
  whereRequired?: string | null;
}

export interface StockCard {
  item: StockCardItem;
  rows: StockCardRow[];
}

export interface StockMovement {
  date: string;
  quantity: number;
  whereRequired?: string;
}

// ── Categories (must match CRM---BE ProcessingCategories.cs) ─────────────────

export const PROCESSING_CATEGORIES = [
  "Processing – Raw Produce",
  "Processing – Ingredients",
  "Processing – Packaging & Supplies",
] as const;

export const RAW_PRODUCE_CATEGORY = PROCESSING_CATEGORIES[0];

// ── Statuses ─────────────────────────────────────────────────────────────────

export const PROCESSING_STATUS_OPTIONS: { value: ProcessingStatus; label: string }[] = [
  { value: "NotStarted", label: "Not Started" },
  { value: "InProgress", label: "In Progress" },
  { value: "Complete", label: "Complete" },
  { value: "OnHold", label: "On Hold" },
  { value: "Overdue", label: "Overdue" },
  { value: "NeedsReview", label: "Needs Review" },
  { value: "NeedsUpdate", label: "Needs Update" },
];

const STATUS_CLASS: Record<ProcessingStatus, string> = {
  NotStarted: "bg-gray-100 text-gray-600 border border-gray-300",
  InProgress: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  Complete: "bg-green-100 text-green-700 border border-green-300",
  OnHold: "bg-blue-100 text-blue-700 border border-blue-300",
  Overdue: "bg-red-100 text-red-700 border border-red-300",
  NeedsReview: "bg-purple-100 text-purple-700 border border-purple-300",
  NeedsUpdate: "bg-orange-100 text-orange-700 border border-orange-300",
};

export const processingStatusBadge = (status: string) => {
  const option = PROCESSING_STATUS_OPTIONS.find((o) => o.value === status);
  return option
    ? { label: option.label, className: STATUS_CLASS[option.value] }
    : { label: String(status), className: "bg-gray-100 text-gray-600" };
};

// ── Yield (mirrors YieldEntryResponse in CRM---BE; never stored) ─────────────

const isKg = (unit?: string | null) => unit?.trim().toLowerCase() === "kg";
const num = (n?: number | null) => (typeof n === "number" && !Number.isNaN(n) ? n : null);

/** The weighed input, or the quantity when it was counted in kg; otherwise unknown. */
export const yieldInputKg = (w: YieldWeights): number | null =>
  num(w.inputWeightKg) ?? (isKg(w.inputUnit) ? num(w.inputQuantity) : null);

/** The last stage the run reached. */
export const yieldOutputKg = (w: YieldWeights): number | null =>
  num(w.secondGrindWeightKg) ?? num(w.grindWeightKg) ?? num(w.dehydratedWeightKg) ?? num(w.cutWeightKg);

const percentOfInput = (w: YieldWeights, kg: number | null) => {
  const input = yieldInputKg(w);
  return kg !== null && input !== null && input > 0 ? (kg / input) * 100 : null;
};

export const yieldPercent = (w: YieldWeights) => percentOfInput(w, yieldOutputKg(w));
export const wastePercent = (w: YieldWeights) => percentOfInput(w, num(w.wasteKg));

export const fmtPercent = (n: number | null | undefined) =>
  typeof n === "number" && !Number.isNaN(n) ? `${n.toFixed(1)}%` : "—";

// ── Errors ───────────────────────────────────────────────────────────────────

export const SAVE_FAILED = "The record could not be saved. Please try again.";

/**
 * The reason to show in a form when a save fails. The API answers a refused save with
 * HTTP 400 and its usual envelope, which axios raises as an error — so the message has
 * to be read from `error.response.data`, not just from a resolved response.
 */
export const apiErrorMessage = (e: unknown): string => {
  const body: any = (e as any)?.response?.data ?? e;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  return body?.isSuccess === false && message ? message : SAVE_FAILED;
};

// ── Mock data (used when NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true") ────────────

export const MOCK_PRODUCTS: ProcessingProduct[] = [];
export const MOCK_ORDER_REQUESTS: OrderRequest[] = [];
export const MOCK_BATCHES: ProductionBatch[] = [];
export const MOCK_YIELD_ENTRIES: YieldEntry[] = [];
export const MOCK_STOCK_CARDS: StockCardItem[] = [];
