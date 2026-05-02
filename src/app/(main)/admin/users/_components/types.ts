// ── User Management types ──────────────────────────────────────────────────

export interface CrmUser {
  id: string;
  name: string;
  email: string;
  departmentName?: string;
  department?: { name: string };
  role?: string;
  roleName?: string;
  accessLevel?: number;
  isOnboarded?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

export interface UnauthorizedLog {
  id: string;
  userName?: string;
  userId?: string;
  action: string;
  timestamp?: string;
  createdAt?: string;
}

// ── Mock data ───────────────────────────────────────────────────────────────

export const MOCK_USERS: CrmUser[] = [
  {
    id: "u1",
    name: "John Admin",
    email: "admin@company.com",
    departmentName: "Management",
    role: "Administrator",
    accessLevel: 5,
    isOnboarded: true,
    isActive: true,
  },
  {
    id: "u2",
    name: "Sarah Finance",
    email: "finance@company.com",
    departmentName: "Finance",
    role: "Finance",
    accessLevel: 4,
    isOnboarded: true,
    isActive: true,
  },
  {
    id: "u3",
    name: "Mike Inventory",
    email: "inventory@company.com",
    departmentName: "Inventory",
    role: "Inventory Officer",
    accessLevel: 4,
    isOnboarded: true,
    isActive: true,
  },
  {
    id: "u4",
    name: "Lisa ICT",
    email: "ict@company.com",
    departmentName: "ICT",
    role: "ICT Administrator",
    accessLevel: 4,
    isOnboarded: true,
    isActive: true,
  },
  {
    id: "u5",
    name: "David Marketing",
    email: "dav@company.com",
    departmentName: "Marketing",
    role: "Department User",
    accessLevel: 1,
    isOnboarded: true,
    isActive: true,
  },
  {
    id: "u6",
    name: "Emma Sales",
    email: "emma@company.com",
    departmentName: "Sales",
    role: "Department User",
    accessLevel: 1,
    isOnboarded: true,
    isActive: true,
  },
  {
    id: "u7",
    name: "Tom Operations",
    email: "tom@company.com",
    departmentName: "Operations",
    role: "Department User",
    accessLevel: 1,
    isOnboarded: false,
    isActive: false,
  },
];

export const MOCK_UNAUTHORIZED_LOGS: UnauthorizedLog[] = [
  {
    id: "log1",
    userName: "Tom Operations",
    action: "Attempted to log inventory item: Office Chair",
    timestamp: "2026-02-05T10:38:00",
  },
  {
    id: "log2",
    userName: "Tom Operations",
    action: "Attempted to create requisition: Training Materials",
    timestamp: "2026-02-04T14:15:00",
  },
];

export const USER_STATUS_FILTERS = [
  { key: "All",           value: "" },
  { key: "Onboarded",     value: "onboarded" },
  { key: "Not Onboarded", value: "not_onboarded" },
];
