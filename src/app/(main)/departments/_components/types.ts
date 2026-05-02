export interface Department {
  id: string;
  name: string;
  code?: string;
  headName?: string;
  head?: { name: string };
  description?: string;
  staffCount?: number;
  userCount?: number;
  membersCount?: number;
  projectCount?: number;
  activeProjects?: number;
  budget?: number;
  totalBudget?: number;
  departmentId?: string; // e.g. "OPS"
}

export interface DepartmentStats {
  totalDepartments: number;
  totalStaff: number;
  activeProjects: number;
  totalBudget: number;
}

// Colour palette for department icons — cycles through colours
export const DEPT_COLORS: { bg: string; icon: string; text: string }[] = [
  { bg: "bg-blue-100",   icon: "text-blue-600",   text: "text-blue-600" },
  { bg: "bg-orange-100", icon: "text-orange-500",  text: "text-orange-500" },
  { bg: "bg-purple-100", icon: "text-purple-600",  text: "text-purple-600" },
  { bg: "bg-green-100",  icon: "text-green-600",   text: "text-green-600" },
  { bg: "bg-teal-100",   icon: "text-teal-600",    text: "text-teal-600" },
  { bg: "bg-indigo-100", icon: "text-indigo-600",  text: "text-indigo-600" },
  { bg: "bg-rose-100",   icon: "text-rose-600",    text: "text-rose-600" },
];

export const fmtBudget = (n?: number) => {
  if (!n) return "₦0";
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n}`;
};

export const MOCK_DEPARTMENTS: Department[] = [
  {
    id: "dept-1",
    name: "Operations",
    code: "OPS",
    headName: "Tom Operations",
    description: "Manages daily operational activities and process optimization across all farm facilities.",
    staffCount: 15,
    activeProjects: 8,
    budget: 2_500_000,
  },
  {
    id: "dept-2",
    name: "Logistics",
    code: "LOG",
    headName: "Sarah Logistics",
    description: "Coordinates transportation, supply chain management, and distribution of products.",
    staffCount: 12,
    activeProjects: 5,
    budget: 1_800_000,
  },
  {
    id: "dept-3",
    name: "Inventory",
    code: "INV",
    headName: "Mike Inventory",
    description: "Oversees stock management, warehouse operations, and inventory tracking systems.",
    staffCount: 8,
    activeProjects: 3,
    budget: 1_200_000,
  },
  {
    id: "dept-4",
    name: "Sales",
    code: "SAL",
    headName: "Emma Sales",
    description: "Drives revenue generation, customer relationships, and market expansion strategies.",
    staffCount: 20,
    activeProjects: 12,
    budget: 3_200_000,
  },
  {
    id: "dept-5",
    name: "Finance",
    code: "FIN",
    headName: "Sarah Finance",
    description: "Manages financial planning, budgeting, accounting, and fiscal compliance.",
    staffCount: 10,
    activeProjects: 6,
    budget: 1_500_000,
  },
  {
    id: "dept-6",
    name: "Processing",
    code: "PRO",
    headName: "James Processing",
    description: "Handles product processing, quality control, and production line management.",
    staffCount: 25,
    activeProjects: 10,
    budget: 4_000_000,
  },
  {
    id: "dept-7",
    name: "Agronomy",
    code: "AGR",
    headName: "Dr. Grace Agronomy",
    description: "Focuses on crop science, soil management, plant health, and agricultural research.",
    staffCount: 18,
    activeProjects: 15,
    budget: 3_600_000,
  },
];
