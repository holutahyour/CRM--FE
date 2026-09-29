// ── Facility Management ───────────────────────────────────────────────────────

/** The four headline counters shown at the top of the Facility Management tab. */
export type FacilityStatKey =
  | "greenhouses"
  | "generators"
  | "staffAccommodation"
  | "shortletAccommodation";

export interface FacilityStats {
  greenhouses: number;
  generators: number;
  staffAccommodation: number;
  shortletAccommodation: number;
}

export interface CohortGreenhouse {
  cohort: number;
  count: number;
}

/** A block of staff accommodation or a building of offices. */
export interface AllocationUnit {
  id: string;
  name: string;
  total: number;
  allocated: number;
}

export interface FacilityOverview {
  stats: FacilityStats;
  cohorts: CohortGreenhouse[];
  staffBlocks: AllocationUnit[];
  offices: AllocationUnit[];
}

export const FACILITY_STAT_LABELS: Record<FacilityStatKey, string> = {
  greenhouses:          "Total Greenhouses",
  generators:           "Generators",
  staffAccommodation:   "Staff Accommodation",
  shortletAccommodation: "Shortlet Accommodation",
};

export const unallocated = (u: AllocationUnit) => Math.max(0, u.total - u.allocated);

// ── Processing ────────────────────────────────────────────────────────────────

// Batch scheduling, order requests, yield and stock cards live in ./processing/types.ts.

export type MachineUsageStatus = "operational" | "maintenance" | "breakdown";

export interface MachineUsageLog {
  id: string;
  date: string;
  machine: string;
  operator?: string;
  startTime?: string;
  endTime?: string;
  hoursUsed: number;
  outputKg: number;
  downtimeMins: number;
  status: MachineUsageStatus | string;
  remarks?: string;
}

// ── Logistics ─────────────────────────────────────────────────────────────────

export type TripStatus = "in_transit" | "completed" | "cancelled";

export interface VehicleTrackingLog {
  id: string;
  date: string;
  vehicle: string;
  driver: string;
  destination?: string;
  departureTime?: string;
  returnTime?: string;
  distanceKm: number;
  purpose?: string;
  status: TripStatus | string;
  remarks?: string;
}

export interface VehicleRefuelingLog {
  id: string;
  date: string;
  vehicle: string;
  driver?: string;
  fuelType: string;
  quantityLitres: number;
  unitCost: number;
  odometerKm: number;
  station?: string;
  remarks?: string;
}

export const totalFuelCost = (l: Pick<VehicleRefuelingLog, "quantityLitres" | "unitCost">) =>
  l.quantityLitres * l.unitCost;

// ── Badges & option lists ─────────────────────────────────────────────────────

export const MACHINE_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  operational: { label: "Operational", className: "bg-green-100 text-green-700 border border-green-300" },
  maintenance: { label: "Maintenance", className: "bg-yellow-100 text-yellow-800 border border-yellow-300" },
  breakdown:   { label: "Breakdown",   className: "bg-red-100 text-red-700 border border-red-300" },
};

export const TRIP_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  in_transit: { label: "In Transit", className: "bg-yellow-100 text-yellow-800 border border-yellow-300" },
  completed:  { label: "Completed",  className: "bg-green-100 text-green-700 border border-green-300" },
  cancelled:  { label: "Cancelled",  className: "bg-red-100 text-red-700 border border-red-300" },
};

export const MACHINE_STATUS_OPTIONS: { value: MachineUsageStatus; label: string }[] = [
  { value: "operational", label: "Operational" },
  { value: "maintenance", label: "Maintenance" },
  { value: "breakdown",   label: "Breakdown" },
];

export const TRIP_STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: "in_transit", label: "In Transit" },
  { value: "completed",  label: "Completed" },
  { value: "cancelled",  label: "Cancelled" },
];

export const FUEL_TYPE_OPTIONS = ["Diesel", "Petrol", "Gas"];

// ── Formatters ────────────────────────────────────────────────────────────────

export const fmtDate = (d?: string) => (d ? d.slice(0, 10) : "\u2014");

/** Renders an ISO datetime-local value ("2026-09-07T08:30") as "2026-09-07 08:30". */
export const fmtDateTime = (d?: string) => (d ? d.replace("T", " ").slice(0, 16) : "\u2014");

export const fmtText = (v?: string | null) => (v && v.trim().length > 0 ? v : "\u2014");

export const fmtNumber = (n?: number) =>
  typeof n === "number" && !Number.isNaN(n) ? n.toLocaleString() : "\u2014";

export const fmtMoney = (n?: number) =>
  typeof n === "number" && !Number.isNaN(n)
    ? `\u20a6${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "\u2014";

// ── Mock data (used when NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true") ─────────────

export const MOCK_FACILITY: FacilityOverview = {
  stats: {
    greenhouses: 33,
    generators: 5,
    staffAccommodation: 45,
    shortletAccommodation: 8,
  },
  cohorts: [
    { cohort: 1,  count: 2 },
    { cohort: 2,  count: 3 },
    { cohort: 3,  count: 2 },
    { cohort: 4,  count: 4 },
    { cohort: 5,  count: 3 },
    { cohort: 6,  count: 2 },
    { cohort: 7,  count: 3 },
    { cohort: 8,  count: 2 },
    { cohort: 9,  count: 4 },
    { cohort: 10, count: 3 },
    { cohort: 11, count: 2 },
    { cohort: 12, count: 3 },
  ],
  staffBlocks: [
    { id: "block-a", name: "Staff Block A", total: 15, allocated: 12 },
    { id: "block-b", name: "Staff Block B", total: 15, allocated: 10 },
    { id: "block-c", name: "Staff Block C", total: 15, allocated: 8 },
  ],
  offices: [
    { id: "office-admin", name: "Admin Building",      total: 20, allocated: 15 },
    { id: "office-ops",   name: "Operations Building", total: 15, allocated: 12 },
    { id: "office-sales", name: "Sales Office",        total: 10, allocated: 8 },
  ],
};

export const MOCK_MACHINE_USAGE_LOGS: MachineUsageLog[] = [];
export const MOCK_VEHICLE_TRACKING_LOGS: VehicleTrackingLog[] = [];
export const MOCK_VEHICLE_REFUELING_LOGS: VehicleRefuelingLog[] = [];
