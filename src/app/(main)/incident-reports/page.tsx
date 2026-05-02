"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, Plus, Search, Loader } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import apiHandler from "@/data/api/ApiHandler";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { APP_INCIDENT_DRAWER } from "@/lib/routes";
import { Incident, STATUS_FILTERS, MOCK_INCIDENTS } from "./_components/types";
import IncidentCard from "./_components/IncidentCard";
import ReportIncidentDrawer from "./_components/ReportIncidentDrawer";
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

const USE_MOCK = process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true";

export default function IncidentReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");

  const [totalRecords, setTotalRecords] = useState(0);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const skipFetchRef = useRef(false);

  // URL to open the Report Incident drawer
  const drawerUrl = useModifyQuery(
    null,
    searchParams,
    [{ key: APP_INCIDENT_DRAWER, value: "true" }],
    "set"
  );

  const fetchData = useCallback(async () => {
    if (skipFetchRef.current) { skipFetchRef.current = false; return; }
    try {
      if (USE_MOCK) {
        const filtered = activeFilter
          ? MOCK_INCIDENTS.filter((i) => i.status === activeFilter)
          : MOCK_INCIDENTS;
        setIncidents(filtered);
        setTotalRecords(filtered.length);
        return;
      }
      const res = await apiHandler.incidents.list({
        status: activeFilter || undefined,
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      });
      if (Array.isArray(res)) {
        setIncidents(res); setTotalRecords(res.length);
      } else if (res?.isSuccess && Array.isArray(res.content)) {
        setIncidents(res.content);
        setTotalRecords(res.metaData?.total ?? res.content.length);
      } else if (res?.isSuccess && res.content && typeof res.content === "object") {
        const items = (res.content as any).items ?? (res.content as any).data ?? [];
        const arr = Array.isArray(items) ? items : [];
        setIncidents(arr);
        setTotalRecords(res.metaData?.total ?? arr.length);
      } else {
        setIncidents([]); setTotalRecords(0);
      }
    } catch (e) {
      console.error("Failed to fetch incidents", e);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Load departments for the Report drawer
  useEffect(() => {
    apiHandler.departments.list().then((res: any) => {
      const arr = res?.isSuccess && Array.isArray(res.content)
        ? res.content
        : Array.isArray(res) ? res : [];
      setDepartments(arr);
    }).catch(() => {});
  }, []);

  // Summary counts
  const openCount       = (USE_MOCK ? MOCK_INCIDENTS : incidents).filter(i => i.status === "open").length;
  const inProgressCount = (USE_MOCK ? MOCK_INCIDENTS : incidents).filter(i => i.status === "in_progress").length;
  const resolvedCount   = (USE_MOCK ? MOCK_INCIDENTS : incidents).filter(i => i.status === "resolved").length;
  const criticalCount   = (USE_MOCK ? MOCK_INCIDENTS : incidents).filter(i => i.severity === "critical").length;

  const handleMarkInProgress = async (id: string) => {
    setActionBusy(id);
    try {
      await apiHandler.incidents.markInProgress(id);
      setIncidents((prev) =>
        prev.map((i) => i.id === id ? { ...i, status: "in_progress" } : i)
      );
    } catch (e) {
      console.error("markInProgress failed", e);
      // optimistic update for mock
      setIncidents((prev) =>
        prev.map((i) => i.id === id ? { ...i, status: "in_progress" } : i)
      );
    } finally {
      setActionBusy(null);
    }
  };

  const handleMarkResolved = (id: string) => {
    setResolveTarget(id);
    setResolution("");
  };

  const confirmResolved = async () => {
    if (!resolveTarget) return;
    setActionBusy(resolveTarget);
    try {
      await apiHandler.incidents.markResolved(resolveTarget, resolution);
      setIncidents((prev) =>
        prev.map((i) =>
          i.id === resolveTarget
            ? { ...i, status: "resolved", resolution, resolvedAt: new Date().toISOString() }
            : i
        )
      );
    } catch (e) {
      // optimistic update for mock
      setIncidents((prev) =>
        prev.map((i) =>
          i.id === resolveTarget
            ? { ...i, status: "resolved", resolution, resolvedAt: new Date().toISOString() }
            : i
        )
      );
    } finally {
      setActionBusy(null);
      setResolveTarget(null);
      setResolution("");
    }
  };

  const filtered = incidents.filter((i) =>
    `${i.deviceName} ${i.deviceCode} ${i.description}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Resolution Modal */}
      {resolveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Mark as Resolved</h3>
            <p className="text-sm text-gray-500 mb-4">Describe how the issue was resolved.</p>
            <textarea
              rows={4}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="e.g. Replaced faulty display cable..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setResolveTarget(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!resolution.trim()}
                onClick={confirmResolved}
                className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Incident Drawer */}
      <ReportIncidentDrawer
        departments={departments}
        onCreated={(incident) => {
          skipFetchRef.current = true;
          setIncidents((prev) => [incident, ...prev]);
          setTotalRecords((prev) => prev + 1);
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Device Incident Reports</h1>
          <p className="text-sm text-gray-500">Report and track device-related incidents</p>
        </div>
        <button
          onClick={() => router.push(drawerUrl)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Report Incident
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Open",        value: openCount,       color: "text-gray-900" },
          { label: "In Progress", value: inProgressCount, color: "text-gray-900" },
          { label: "Resolved",    value: resolvedCount,   color: "text-gray-900" },
          { label: "Critical",    value: criticalCount,   color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-2">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex items-center gap-3 flex-wrap">
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
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Incident Cards */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
            <Loader className="w-6 h-6 text-green-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm text-gray-400">
            <AlertTriangle className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No incidents found</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filtered.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onMarkInProgress={handleMarkInProgress}
                onMarkResolved={handleMarkResolved}
                actionBusy={actionBusy}
              />
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
