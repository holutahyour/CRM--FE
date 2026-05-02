export interface MonthlyReport {
  id: string;
  goalTitle: string;
  targetValue: number;
  achievedValue: number;
  month: string;
  year: string;
  notes?: string;
  departmentName?: string;
  department?: { name: string };
  submittedByName?: string;
  createdAt?: string;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const STATUS_FILTERS = [
  { key: "All",      value: "" },
  { key: "On Track", value: "on_track" },
  { key: "At Risk",  value: "at_risk" },
  { key: "Exceeded", value: "exceeded" },
];

/** Returns achievement % clamped to 0–200 */
export const achievementPct = (r: MonthlyReport) =>
  r.targetValue > 0
    ? Math.round((r.achievedValue / r.targetValue) * 100)
    : 0;

export const fmtMonth = (month: string, year: string) =>
  `${month} ${year}`;

export const MOCK_REPORTS: MonthlyReport[] = [
  {
    id: "mock-1",
    goalTitle: "Lead Generation",
    targetValue: 500,
    achievedValue: 425,
    month: "January",
    year: "2026",
    notes: "Strong performance, exceeded target in last week",
    departmentName: "Marketing",
    submittedByName: "David Marketing",
  },
  {
    id: "mock-2",
    goalTitle: "Sales Revenue (₦)",
    targetValue: 100000,
    achievedValue: 95000,
    month: "January",
    year: "2026",
    notes: "Nearly met target, had 3 major deals close",
    departmentName: "Sales",
    submittedByName: "Emma Sales",
  },
  {
    id: "mock-3",
    goalTitle: "Customer Support Tickets Resolved",
    targetValue: 200,
    achievedValue: 200,
    month: "January",
    year: "2026",
    notes: "All tickets resolved on time.",
    departmentName: "Operations",
    submittedByName: "Tom Operations",
  },
  {
    id: "mock-4",
    goalTitle: "New Client Onboarding",
    targetValue: 20,
    achievedValue: 14,
    month: "January",
    year: "2026",
    notes: "Q1 slowdown affected targets",
    departmentName: "Sales",
    submittedByName: "Emma Sales",
  },
];

/** Group reports by department for bar chart */
export function groupByDepartment(reports: MonthlyReport[]): { dept: string; avg: number }[] {
  const map: Record<string, number[]> = {};
  for (const r of reports) {
    const dept = r.department?.name ?? r.departmentName ?? "Unknown";
    if (!map[dept]) map[dept] = [];
    map[dept].push(achievementPct(r));
  }
  return Object.entries(map).map(([dept, values]) => ({
    dept,
    avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
  }));
}
