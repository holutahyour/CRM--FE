export interface Requisition {
  id: string;
  title: string;
  amount: number;
  description: string;
  status: 1 | 2 | 3 | "Pending" | "Approved" | "Rejected";
  reason?: string;
  date?: string;
  createdAt?: string;
  submittedByName?: string;
  department?: { name: string };
  departmentName?: string;
  actionedBy?: string;
  actionedByName?: string;
  fileUrl?: string;
  fileOriginalName?: string;
}

export const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  Pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
  Approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  Rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  Draft: { label: "Draft", className: "bg-gray-100 text-gray-500" },
};

export const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

export const fmtDate = (d?: string) =>
  d ? new Date(d).toISOString().slice(0, 10) : "—";

export const MOCK_REQUISITIONS: Requisition[] = [
  {
    id: "mock-1",
    title: "Marketing Campaign Materials",
    amount: 5000,
    description: "Budget for Q1 marketing campaign materials including banners, flyers, and digital ads",
    status: 1,
    date: "2026-02-03",
    submittedByName: "David Marketing",
    departmentName: "Marketing",
  },
  {
    id: "mock-2",
    title: "Office Furniture",
    amount: 12000,
    description: "New desks and chairs for the sales team expansion",
    status: 1,
    date: "2026-02-04",
    submittedByName: "Emma Sales",
    departmentName: "Sales",
  },
  {
    id: "mock-3",
    title: "Training Workshop",
    amount: 3500,
    description: "External training for operations team on new software",
    status: 2,
    date: "2026-01-28",
    submittedByName: "Tom Operations",
    departmentName: "Operations",
  },
  {
    id: "mock-4",
    title: "Travel Expenses",
    amount: 8000,
    description: "Client meeting travel expenses for February",
    status: 3,
    reason: "Budget exceeded for travel this quarter. Please resubmit with reduced amount.",
    date: "2026-01-30",
    submittedByName: "Emma Sales",
    departmentName: "Sales",
  },
  {
    id: "mock-5",
    title: "IT Equipment Upgrade",
    amount: 25000,
    description: "Replacement laptops and peripherals for the engineering team",
    status: 1,
    date: "2026-02-10",
    submittedByName: "Alex IT",
    departmentName: "Information Technology",
  },
];
