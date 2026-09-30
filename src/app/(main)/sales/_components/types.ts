// Sales Department (EPL Poultry) — daily production, sales, feed cost and stock.
//
// Every "auto" column shown in the UI is derived here rather than stored, so a
// record can never disagree with its own totals.

/** Eggs in one crate — the conversion used across the Stock tab. */
export const EGGS_PER_CRATE = 28;

export const toCrates = (eggs?: number) =>
  typeof eggs === "number" && Number.isFinite(eggs) ? Math.round(eggs / EGGS_PER_CRATE) : 0;

// ── Daily Production ──────────────────────────────────────────────────────────

export interface DailyProduction {
  id: string;
  date: string;
  openingBirds: number;
  eggsMorning: number;
  totalEggs: number;
  totalEggsCrates: number;
  cracked: number;
  bad: number;
  smallEggs: number;
}

/** Cracked + bad eggs. */
export const totalLoss = (p: Pick<DailyProduction, "cracked" | "bad">) =>
  (p.cracked ?? 0) + (p.bad ?? 0);

/** Eggs left after losses and undersized eggs are taken off the day's total. */
export const goodEggs = (p: Pick<DailyProduction, "totalEggs" | "cracked" | "bad" | "smallEggs">) =>
  Math.max(0, (p.totalEggs ?? 0) - totalLoss(p) - (p.smallEggs ?? 0));

// ── Sales ─────────────────────────────────────────────────────────────────────

export const PAYMENT_MODES = ["Cash", "Transfer", "POS", "Cheque", "Credit"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export interface SaleRecord {
  id: string;
  date: string;
  customer: string;
  /** Crates sold. */
  quantity: number;
  /** Price per crate. */
  price: number;
  paid: number;
  modeOfPayment: PaymentMode | string;
  remarks?: string;
}

export const saleTotal = (s: Pick<SaleRecord, "quantity" | "price">) =>
  (s.quantity ?? 0) * (s.price ?? 0);

export const saleBalance = (s: Pick<SaleRecord, "quantity" | "price" | "paid">) =>
  saleTotal(s) - (s.paid ?? 0);

// ── Feed Cost ─────────────────────────────────────────────────────────────────

export interface FeedCostRecord {
  id: string;
  date: string;
  feedType: string;
  /** Bags purchased. */
  quantity: number;
  costPerBag: number;
}

export const feedTotal = (f: Pick<FeedCostRecord, "quantity" | "costPerBag">) =>
  (f.quantity ?? 0) * (f.costPerBag ?? 0);

// ── Stock ─────────────────────────────────────────────────────────────────────

export interface StockRecord {
  id: string;
  date: string;
  openingEggs: number;
  openingCrates: number;
  produced: number;
  sold: number;
  soldCrates: number;
  loss: number;
  lossCrates: number;
}

export const closingEggs = (s: Pick<StockRecord, "openingEggs" | "produced" | "sold" | "loss">) =>
  (s.openingEggs ?? 0) + (s.produced ?? 0) - (s.sold ?? 0) - (s.loss ?? 0);

export const closingCrates = (s: Parameters<typeof closingEggs>[0]) => toCrates(closingEggs(s));

/** The stock row with the most recent date — what the dashboard reports as current. */
export const latestStock = (records: StockRecord[]) =>
  records.length === 0
    ? undefined
    : records.reduce((latest, r) => (r.date > latest.date ? r : latest), records[0]);

// ── Saving ────────────────────────────────────────────────────────────────────

/** Shown when a save fails without the API naming a reason. */
export const SAVE_FAILED = "The record could not be saved. Please try again.";

/** The reason to show in a form after a failed save. */
export const saveErrorMessage = (e: unknown) =>
  e instanceof Error && e.message.trim().length > 0 ? e.message : SAVE_FAILED;

/** A form field's text as a number, with anything unparseable read as 0. */
export const parseNum = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ── Formatters ────────────────────────────────────────────────────────────────

export const fmtDate = (d?: string) => (d ? d.slice(0, 10) : "\u2014");

export const fmtText = (v?: string | null) => (v && v.trim().length > 0 ? v : "\u2014");

export const fmtNumber = (n?: number) =>
  typeof n === "number" && !Number.isNaN(n) ? n.toLocaleString() : "\u2014";

/** Naira, whole units — poultry amounts are never quoted in kobo here. */
export const fmtNaira = (n?: number) =>
  typeof n === "number" && !Number.isNaN(n)
    ? `\u20a6${Math.round(n).toLocaleString()}`
    : "\u2014";

/** Sorted oldest → newest, for charts that read left-to-right in time. */
export const byDateAsc = <T extends { date: string }>(rows: T[]) =>
  [...rows].sort((a, b) => a.date.localeCompare(b.date));

/** "2026-06-01" → "06-01", the compact axis label used on the dashboard. */
export const axisDate = (d: string) => (d.length >= 10 ? d.slice(5, 10) : d);

// ── Mock data (used when NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true") ─────────────

export const MOCK_PRODUCTION: DailyProduction[] = [
  {
    id: "prod-1", date: "2026-06-01", openingBirds: 500, eggsMorning: 420,
    totalEggs: 420, totalEggsCrates: 15, cracked: 8, bad: 4, smallEggs: 20,
  },
  {
    id: "prod-2", date: "2026-06-02", openingBirds: 498, eggsMorning: 410,
    totalEggs: 410, totalEggsCrates: 14, cracked: 5, bad: 3, smallEggs: 15,
  },
];

export const MOCK_SALES: SaleRecord[] = [
  {
    id: "sale-1", date: "2026-06-01", customer: "XYZ Restaurant", quantity: 10,
    price: 1800, paid: 18000, modeOfPayment: "Transfer", remarks: "Full payment",
  },
  {
    id: "sale-2", date: "2026-06-02", customer: "Local Market", quantity: 5,
    price: 1750, paid: 5000, modeOfPayment: "Cash", remarks: "Balance due Friday",
  },
];

export const MOCK_FEED_COSTS: FeedCostRecord[] = [
  { id: "feed-1", date: "2026-06-01", feedType: "Layers Mash",  quantity: 10, costPerBag: 12000 },
  { id: "feed-2", date: "2026-06-02", feedType: "Concentrates", quantity: 5,  costPerBag: 9500 },
];

export const MOCK_STOCK: StockRecord[] = [
  {
    id: "stock-1", date: "2026-06-01", openingEggs: 200, openingCrates: 7,
    produced: 420, sold: 360, soldCrates: 13, loss: 12, lossCrates: 0,
  },
  {
    id: "stock-2", date: "2026-06-02", openingEggs: 248, openingCrates: 9,
    produced: 410, sold: 300, soldCrates: 11, loss: 8, lossCrates: 0,
  },
];
