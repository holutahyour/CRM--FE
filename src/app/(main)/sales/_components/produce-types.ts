// Sales Department (Fresh Produce) — packhouse intake, sales and weekly summary.
//
// As with the poultry records, every "auto" column is derived here rather than
// stored, so a record can never disagree with its own totals.

// ── Packhouse Intake ──────────────────────────────────────────────────────────

export interface PackhouseIntake {
  id: string;
  date: string;
  produceType: string;
  /** Kilograms graded A. */
  gradeA: number;
  gradeB: number;
  gradeC: number;
  /** Kilograms rejected at intake — reported as spoilage. */
  rejected: number;
  quantityHarvested: number;
  remarks?: string;
}

/** Graded weight, A + B + C. */
export const intakeAccepted = (i: Pick<PackhouseIntake, "gradeA" | "gradeB" | "gradeC">) =>
  (i.gradeA ?? 0) + (i.gradeB ?? 0) + (i.gradeC ?? 0);

// ── Sales ─────────────────────────────────────────────────────────────────────

export const PRODUCE_GRADES = ["Grade A", "Grade B", "Grade C"] as const;

export const PRODUCE_CATEGORIES = [
  "Habanero",
  "Bell Pepper",
  "Tomato",
  "Cucumber",
  "Other",
] as const;

export const PAYMENT_STATUSES = ["Fully Paid", "Outstanding"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface ProduceSale {
  id: string;
  date: string;
  customer: string;
  location?: string;
  produceType?: string;
  grade?: string;
  category: string;
  /** Kilograms sold. */
  quantity: number;
  pricePerKg: number;
  paid: number;
  /** Shown as the "Remarks" column — the sheet records payment mode there. */
  modeOfPayment: string;
  paymentStatus: PaymentStatus | string;
}

export const produceSaleTotal = (s: Pick<ProduceSale, "quantity" | "pricePerKg">) =>
  (s.quantity ?? 0) * (s.pricePerKg ?? 0);

export const produceSaleBalance = (s: Pick<ProduceSale, "quantity" | "pricePerKg" | "paid">) =>
  produceSaleTotal(s) - (s.paid ?? 0);

// ── Weekly Sales Summary ──────────────────────────────────────────────────────

export interface WeeklySummary {
  id: string;
  weekStart: string;
  weekEnd: string;
  totalSales: number;
  totalPaid: number;
}

export const weeklyBalance = (w: Pick<WeeklySummary, "totalSales" | "totalPaid">) =>
  (w.totalSales ?? 0) - (w.totalPaid ?? 0);

// ── Mock data (used when NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true") ─────────────

export const MOCK_INTAKE: PackhouseIntake[] = [
  {
    id: "intake-1", date: "2026-06-01", produceType: "Habanero",
    gradeA: 150, gradeB: 100, gradeC: 50, rejected: 20, quantityHarvested: 320,
  },
  {
    id: "intake-2", date: "2026-06-02", produceType: "Bell Pepper",
    gradeA: 120, gradeB: 100, gradeC: 50, rejected: 10, quantityHarvested: 280,
  },
];

export const MOCK_PRODUCE_SALES: ProduceSale[] = [
  {
    id: "psale-1", date: "2026-06-01", customer: "Abuja Supermart", location: "Abuja",
    produceType: "Habanero", grade: "Grade A", category: "Habanero", quantity: 80,
    pricePerKg: 2500, paid: 200000, modeOfPayment: "Transfer", paymentStatus: "Fully Paid",
  },
  {
    id: "psale-2", date: "2026-06-02", customer: "Green Fresh Market", location: "Lagos",
    produceType: "Bell Pepper", grade: "Grade B", category: "Bell Pepper", quantity: 120,
    pricePerKg: 1800, paid: 100000, modeOfPayment: "Cash", paymentStatus: "Outstanding",
  },
];

export const MOCK_WEEKLY: WeeklySummary[] = [
  { id: "week-1", weekStart: "2026-06-01", weekEnd: "2026-06-07", totalSales: 416000, totalPaid: 300000 },
];
