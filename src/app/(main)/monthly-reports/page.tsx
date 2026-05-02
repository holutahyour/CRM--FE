"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, Loader, BarChart2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import apiHandler from "@/data/api/ApiHandler";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { APP_MONTHLY_REPORT_DRAWER } from "@/lib/routes";
import {
  MonthlyReport,
  MOCK_REPORTS,
  STATUS_FILTERS,
  achievementPct,
  groupByDepartment,
  MONTH_NAMES,
} from "./_components/types";
import ReportCard from "./_components/ReportCard";
import SubmitReportDrawer from "./_components/SubmitReportDrawer";
import { HStack } from "@chakra-ui/react";
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/chakra-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/sdcn-select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

const USE_MOCK = process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true";
const currentYear = new Date().getFullYear();

function statusMatch(report: MonthlyReport, filter: string) {
  if (!filter) return true;
  const pct = achievementPct(report);
  if (filter === "exceeded")  return pct >= 100;
  if (filter === "on_track")  return pct >= 80 && pct < 100;
  if (filter === "at_risk")   return pct >= 50 && pct < 80;
  return true;
}

export default function MonthlyReportsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [reports, setReports]             = useState<MonthlyReport[]>([]);
  const [departments, setDepartments]     = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [activeFilter, setActiveFilter]   = useState("");
  const [selectedYear, setSelectedYear]   = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(""); // empty = All

  const [totalRecords, setTotalRecords] = useState(0);
  const [pagination, setPagination]     = useState({ pageIndex: 0, pageSize: 10 });
  const skipFetchRef                    = useRef(false);

  // URL that opens the Submit Report drawer
  const drawerUrl = useModifyQuery(
    null,
    searchParams,
    [{ key: APP_MONTHLY_REPORT_DRAWER, value: "true" }],
    "set"
  );

  const fetchData = useCallback(async () => {
    if (skipFetchRef.current) { skipFetchRef.current = false; return; }
    try {
      if (USE_MOCK) {
        setReports(MOCK_REPORTS);
        setTotalRecords(MOCK_REPORTS.length);
        return;
      }
      const res = await apiHandler.monthlyReports.list({
        year:     selectedYear,
        month:    selectedMonth || undefined,
        page:     pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      });
      if (Array.isArray(res)) {
        setReports(res); setTotalRecords(res.length);
      } else if (res?.isSuccess && Array.isArray(res.content)) {
        setReports(res.content);
        setTotalRecords(res.metaData?.total ?? res.content.length);
      } else if (res?.isSuccess && res.content && typeof res.content === "object") {
        const items = (res.content as any).items ?? (res.content as any).data ?? [];
        const arr = Array.isArray(items) ? items : [];
        setReports(arr);
        setTotalRecords(res.metaData?.total ?? arr.length);
      } else {
        setReports([]); setTotalRecords(0);
      }
    } catch (e) {
      console.error("Failed to fetch monthly reports", e);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Load departments for the drawer
  useEffect(() => {
    apiHandler.departments.list().then((res: any) => {
      const arr =
        res?.isSuccess && Array.isArray(res.content)
          ? res.content
          : Array.isArray(res) ? res : [];
      setDepartments(arr);
    }).catch(() => {});
  }, []);

  const filtered = reports.filter(
    (r) =>
      statusMatch(r, activeFilter) &&
      (r.goalTitle ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const chartData = groupByDepartment(USE_MOCK ? MOCK_REPORTS : reports);

  const BAR_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <div className="p-6 space-y-6">
      {/* Submit Report Drawer — driven by ?monthly_report_drawer=true */}
      <SubmitReportDrawer
        departments={departments}
        onCreated={(report) => {
          skipFetchRef.current = true;
          setReports((prev) => [report, ...prev]);
          setTotalRecords((prev) => prev + 1);
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Reports</h1>
          <p className="text-sm text-gray-500">Track goals achieved by users across departments</p>
        </div>
        <button
          onClick={() => router.push(drawerUrl)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      {/* Bar Chart — Department Performance */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
        <div className="mb-1">
          <h2 className="text-sm font-semibold text-gray-900">Department Performance Overview</h2>
          <p className="text-xs text-green-600 mt-0.5">Average goal achievement by department</p>
        </div>

        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <BarChart2 className="w-8 h-8 opacity-30 mr-2" />
            <span className="text-sm">No data for chart</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="dept"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: any) => [`${value}%`, "Avg Achievement"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Legend
                iconType="square"
                iconSize={10}
                wrapperStyle={{ fontSize: 12, color: "#6b7280", paddingTop: 8 }}
                formatter={() => "Avg Achievement %"}
              />
              <Bar dataKey="avg" name="Avg Achievement %" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={entry.dept} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Year picker */}
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          {Array.from({ length: 6 }, (_, i) => currentYear - 2 + i).map((y) => (
            <option key={y} value={y.toString()}>{y}</option>
          ))}
        </select>

        {/* Month picker */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <option value="">All Months</option>
          {MONTH_NAMES.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {/* Status filter tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeFilter === f.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.key}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search goal titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Report Cards */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
            <Loader className="w-6 h-6 text-green-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm text-gray-400">
            <BarChart2 className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No reports found</p>
          </div>
        ) : (
          <div>
            {filtered.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}

            {totalRecords > 0 && (
              <div className="pt-4 flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-nowrap text-gray-500">Rows per page</p>
                  <Select
                    value={`${pagination.pageSize}`}
                    onValueChange={(value) => {
                      setPagination({ pageIndex: 0, pageSize: Number(value) });
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px] bg-white">
                      <SelectValue placeholder={pagination.pageSize} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 20, 50, 100].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`} className="text-xs">
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {totalRecords > pagination.pageSize && (
                  <PaginationRoot
                    page={pagination.pageIndex + 1}
                    count={totalRecords}
                    pageSize={pagination.pageSize}
                    onPageChange={(e) =>
                      setPagination((prev) => ({ ...prev, pageIndex: e.page - 1 }))
                    }
                  >
                    <HStack>
                      <PaginationPrevTrigger />
                      <PaginationItems />
                      <PaginationNextTrigger />
                    </HStack>
                  </PaginationRoot>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
