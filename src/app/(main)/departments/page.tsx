"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Building2, Plus, Search, Loader, Users, Settings, Wallet } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import apiHandler from "@/data/api/ApiHandler";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { APP_ADD_DEPARTMENT_DRAWER, APP_EDIT_DEPARTMENT_DRAWER } from "@/lib/routes";
import { Department, DepartmentStats, MOCK_DEPARTMENTS, fmtBudget } from "./_components/types";
import DepartmentCard from "./_components/DepartmentCard";
import AddDepartmentDrawer from "./_components/AddDepartmentDrawer";
import EditDepartmentDrawer from "./_components/EditDepartmentDrawer";

const USE_MOCK = process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true";

// ── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-1 min-w-0">
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${highlight ? "text-[#7cc843]" : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DepartmentsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  const skipFetchRef = useRef(false);

  // ── URL helpers ──────────────────────────────────────────────────────────
  const addDrawerUrl = useModifyQuery(
    null,
    searchParams,
    [{ key: APP_ADD_DEPARTMENT_DRAWER, value: "true" }],
    "set"
  );
  const editDrawerUrl = useModifyQuery(
    null,
    searchParams,
    [{ key: APP_EDIT_DEPARTMENT_DRAWER, value: "true" }],
    "set"
  );

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }
    try {
      if (USE_MOCK) {
        setDepartments(MOCK_DEPARTMENTS);
        return;
      }
      const res = await apiHandler.departments.list();
      if (res?.isSuccess && Array.isArray(res.content)) {
        setDepartments(res.content);
      } else if (Array.isArray(res)) {
        setDepartments(res);
      } else {
        setDepartments([]);
      }
    } catch (e) {
      console.error("Failed to fetch departments", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats: DepartmentStats = {
    totalDepartments: departments.length,
    totalStaff:       departments.reduce((s, d) => s + (d.staffCount ?? d.userCount ?? d.membersCount ?? 0), 0),
    activeProjects:   departments.reduce((s, d) => s + (d.activeProjects ?? d.projectCount ?? 0), 0),
    totalBudget:      departments.reduce((s, d) => s + (d.budget ?? d.totalBudget ?? 0), 0),
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = departments.filter((d) =>
    (d.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.headName || d.head?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreated = (dept: Department) => {
    skipFetchRef.current = true;
    setDepartments((prev) => [dept, ...prev]);
  };

  const handleUpdated = (dept: Department) => {
    skipFetchRef.current = true;
    setDepartments((prev) => prev.map((d) => (d.id === dept.id ? dept : d)));
    setSelectedDept(null);
  };

  const handleEditClick = (dept: Department) => {
    setSelectedDept(dept);
    router.push(editDrawerUrl);
  };

  return (
    <div className="p-6 space-y-6">
      {/* ── Drawers ─────────────────────────────────────────────────────────── */}
      <AddDepartmentDrawer onCreated={handleCreated} />
      <EditDepartmentDrawer
        dept={selectedDept}
        onUpdated={handleUpdated}
        onClose={() => setSelectedDept(null)}
      />

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Overview of all organizational departments at SFARM LAB
          </p>
        </div>
        <button
          onClick={() => router.push(addDrawerUrl)}
          className="flex items-center gap-2 bg-[#7cc843] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#68a638] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {/* ── Summary stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Departments" value={stats.totalDepartments} />
        <StatCard label="Total Staff"       value={stats.totalStaff} />
        <StatCard label="Active Projects"   value={stats.activeProjects} />
        <StatCard label="Total Budget"      value={fmtBudget(stats.totalBudget)} highlight />
      </div>

      {/* ── Search ───────────────────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search departments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        />
      </div>

      {/* ── Cards grid ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Loader className="w-6 h-6 text-green-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm text-gray-400">
          <Building2 className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No departments found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((d, i) => (
            <DepartmentCard
              key={d.id}
              dept={d}
              colorIndex={i}
              onEdit={handleEditClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
