export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "in_progress" | "resolved" | "closed";

export interface Incident {
  id: string;
  deviceName: string;
  deviceCode: string;
  severity: IncidentSeverity | string;
  status: IncidentStatus | string;
  description: string;
  resolution?: string;
  reportedBy?: string;
  reportedByName?: string;
  departmentName?: string;
  department?: { name: string };
  createdAt?: string;
  resolvedAt?: string;
}

export const SEVERITY_BADGE: Record<string, { label: string; className: string }> = {
  low:      { label: "low",      className: "bg-blue-100 text-blue-700" },
  medium:   { label: "medium",   className: "bg-yellow-100 text-yellow-800" },
  high:     { label: "high",     className: "bg-orange-100 text-orange-700" },
  critical: { label: "critical", className: "bg-red-600 text-white" },
};

export const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  open:        { label: "open",        className: "bg-gray-100 text-gray-600 border border-gray-300" },
  in_progress: { label: "in_progress", className: "bg-yellow-100 text-yellow-800 border border-yellow-300" },
  resolved:    { label: "resolved",    className: "bg-green-100 text-green-700 border border-green-300" },
  closed:      { label: "closed",      className: "bg-gray-200 text-gray-500" },
};

export const STATUS_FILTERS = [
  { key: "All",         value: "" },
  { key: "Open",        value: "open" },
  { key: "In Progress", value: "in_progress" },
  { key: "Resolved",    value: "resolved" },
  { key: "Closed",      value: "closed" },
];

export const fmtDate = (d?: string) =>
  d ? new Date(d).toISOString().slice(0, 10) : "—";

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: "mock-1",
    deviceName: "Laptop",
    deviceCode: "LP-1234",
    severity: "high",
    status: "in_progress",
    description: "Laptop not turning on, power button unresponsive",
    reportedByName: "David Marketing",
    departmentName: "Marketing",
    createdAt: "2026-02-03",
  },
  {
    id: "mock-2",
    deviceName: "Printer",
    deviceCode: "PR-5678",
    severity: "medium",
    status: "open",
    description: "Printer jamming constantly, paper feed issue",
    reportedByName: "Emma Sales",
    departmentName: "Sales",
    createdAt: "2026-02-04",
  },
  {
    id: "mock-3",
    deviceName: "Monitor",
    deviceCode: "MN-9012",
    severity: "low",
    status: "resolved",
    description: "Display flickering intermittently",
    resolution: "Replaced faulty display cable. Tested and working properly.",
    reportedByName: "Tom Operations",
    departmentName: "Operations",
    createdAt: "2026-01-30",
    resolvedAt: "2026-02-02",
  },
  {
    id: "mock-4",
    deviceName: "Server",
    deviceCode: "SV-3456",
    severity: "critical",
    status: "in_progress",
    description: "Server overheating, automatic shutdowns occurring every 2 hours",
    reportedByName: "Lisa ICT",
    departmentName: "ICT",
    createdAt: "2026-02-05",
  },
];
