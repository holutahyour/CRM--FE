"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, Plus, Search, Loader, AlertTriangle,
  UserCheck, UserX, Edit2,
} from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format } from "date-fns";
import apiHandler from "@/data/api/ApiHandler";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { APP_UPDATE_USER_DRAWER } from "@/lib/routes";
import {
  CrmUser,
  UnauthorizedLog,
  USER_STATUS_FILTERS,
  MOCK_USERS,
  MOCK_UNAUTHORIZED_LOGS,
} from "./_components/types";
import UpdateUserDrawer from "./_components/UpdateUserDrawer";
import ImportUsersDrawer, { APP_IMPORT_USERS_DRAWER } from "./_components/ImportUsersDrawer";
import { Upload } from "lucide-react";
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

export default function UserManagementPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers]               = useState<CrmUser[]>([]);
  const [logs, setLogs]                 = useState<UnauthorizedLog[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [actionBusy, setActionBusy]     = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pagination, setPagination]     = useState({ pageIndex: 0, pageSize: 10 });
  const skipFetchRef                    = useRef(false);

  const pathName = usePathname();

  const fetchData = useCallback(async () => {
    if (skipFetchRef.current) { skipFetchRef.current = false; return; }
    try {
      if (USE_MOCK) {
        let filtered = MOCK_USERS;
        if (activeFilter === "onboarded")     filtered = MOCK_USERS.filter(u => u.isOnboarded);
        if (activeFilter === "not_onboarded") filtered = MOCK_USERS.filter(u => !u.isOnboarded);
        setUsers(filtered);
        setTotalRecords(filtered.length);
        setLogs(MOCK_UNAUTHORIZED_LOGS);
        return;
      }
      const isOnboarded =
        activeFilter === "onboarded"     ? true  :
        activeFilter === "not_onboarded" ? false : undefined;

      const [usersRes, logsRes] = await Promise.allSettled([
        apiHandler.users.list({
          page:     pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          search:   search || undefined,
          isOnboarded,
        }),
        apiHandler.users.getUnauthorizedLogs(),
      ]);

      if (usersRes.status === "fulfilled") {
        const res = usersRes.value;
        if (Array.isArray(res)) {
          setUsers(res); setTotalRecords(res.length);
        } else if ((res as any)?.isSuccess && Array.isArray((res as any).content)) {
          setUsers((res as any).content);
          setTotalRecords((res as any).metaData?.total ?? (res as any).content.length);
        } else {
          setUsers([]); setTotalRecords(0);
        }
      }

      if (logsRes.status === "fulfilled") {
        const res = logsRes.value;
        const arr = Array.isArray(res)
          ? res
          : Array.isArray((res as any)?.content)
            ? (res as any).content
            : [];
        setLogs(arr);
      }
    } catch (e) {
      console.error("Failed to fetch users", e);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, search, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleOnboard = async (id: string) => {
    setActionBusy(id);
    try {
      await apiHandler.users.onboard(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isOnboarded: true } : u));
    } catch (e) {
      console.error("Onboard failed", e);
    } finally {
      setActionBusy(null);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    setActionBusy(id);
    try {
      await apiHandler.users.toggleActive(id, !current);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !current } : u));
    } catch (e) {
      console.error("Toggle failed", e);
    } finally {
      setActionBusy(null);
    }
  };

  const filtered = users.filter(u =>
    (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const notOnboarded   = users.filter(u => !u.isOnboarded);
  const onboardedCount = users.filter(u => u.isOnboarded).length;

  const stats = [
    { label: "Total Users",          value: totalRecords || users.length, color: "text-gray-800" },
    { label: "Onboarded",            value: onboardedCount,               color: "text-green-600" },
    { label: "Not Onboarded",        value: notOnboarded.length,          color: "text-red-500" },
    { label: "Unauthorized Actions", value: logs.length,                  color: "text-orange-500" },
  ];

  const fmtTs = (ts?: string) => {
    if (!ts) return "";
    try { return format(new Date(ts), "yyyy-MM-dd HH:mm"); } catch { return ts; }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Add User Drawer */}
      <UpdateUserDrawer
        onUpdated={(user) => {
          skipFetchRef.current = true;
          setUsers(prev => prev.map(u => u.id === user.id ? user : u));
        }}
      />
      <ImportUsersDrawer />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">Manage user access and track activity</p>
        </div>
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.set(APP_IMPORT_USERS_DRAWER, "true");
            router.push(`${pathName}?${params.toString()}`);
          }}
          className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm active:scale-95"
        >
          <Upload className="w-4 h-4" />
          Import Users
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-2">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Not Onboarded Alert Banner */}
      {notOnboarded.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
            <p className="text-sm font-semibold text-orange-700">
              Users Not Onboarded ({notOnboarded.length})
            </p>
          </div>
          <p className="text-xs text-orange-600 -mt-1">
            These users have limited access and their activities are being logged
          </p>
          <div className="space-y-2">
            {notOnboarded.map((u) => (
              <div
                key={u.id}
                className="bg-white border border-orange-100 rounded-lg px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500">
                    {u.email}
                    {u.department?.name || u.departmentName
                      ? ` • ${u.department?.name ?? u.departmentName}`
                      : ""}
                  </p>
                </div>
                <button
                  disabled={actionBusy === u.id}
                  onClick={() => handleOnboard(u.id)}
                  className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {actionBusy === u.id ? (
                    <Loader className="w-3 h-3 animate-spin" />
                  ) : (
                    <UserCheck className="w-3 h-3" />
                  )}
                  Onboard
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unauthorized Activity Log */}
      {logs.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Unauthorized Activity Log</h2>
            <p className="text-xs text-green-600 mt-0.5">Actions attempted by users who are not onboarded</p>
          </div>
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                    <p className="text-xs text-green-600">
                      {log.userName}
                      {log.timestamp ? ` • ${fmtTs(log.timestamp)}` : ""}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
                  Blocked
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Users Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-green-700">All Users</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage user access levels based on organizational hierarchy</p>
          </div>

          {/* Filter + Search */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              {USER_STATUS_FILTERS.map((f) => (
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
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-6 h-6 text-green-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-green-700">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-green-700">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-green-700">Department</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-green-700">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-green-700">Access Level</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-green-700">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-green-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    {/* Name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <span className="font-medium text-green-700 text-sm">{u.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3 text-green-600 text-sm">{u.email}</td>

                    {/* Department */}
                    <td className="px-5 py-3 text-gray-600 text-sm">
                      {u.department?.name ?? u.departmentName ?? "—"}
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 text-xs text-gray-700 bg-white">
                        {u.role ?? u.roleName ?? "—"}
                      </span>
                    </td>

                    {/* Access Level */}
                    <td className="px-5 py-3">
                      <span className="text-xs text-gray-600">
                        ○ Level {u.accessLevel ?? "—"}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-3">
                      {u.isOnboarded ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                          <UserCheck className="w-3 h-3" />
                          Onboarded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                          <UserX className="w-3 h-3" />
                          Not Onboarded
                        </span>
                      )}
                    </td>

                    {/* Active toggle */}
                    <td className="px-5 py-3">
                      <button
                        disabled={actionBusy === u.id}
                        onClick={() => handleToggleActive(u.id, !!u.isActive)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                          u.isActive ? "bg-green-500" : "bg-gray-200"
                        } ${actionBusy === u.id ? "opacity-50" : ""}`}
                        title={u.isActive ? "Deactivate user" : "Activate user"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition duration-200 ${
                            u.isActive ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => {
                          const newParams = new URLSearchParams(searchParams.toString());
                          newParams.set(APP_UPDATE_USER_DRAWER, u.id);
                          router.push(`${pathName}?${newParams.toString()}`);
                        }}
                        className="p-1 text-gray-500 hover:text-green-600 transition-colors ml-2"
                        title="Edit user"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalRecords > 0 && !loading && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-500">Rows per page</p>
              <Select
                value={`${pagination.pageSize}`}
                onValueChange={(value) => setPagination({ pageIndex: 0, pageSize: Number(value) })}
              >
                <SelectTrigger className="h-8 w-[70px] bg-white">
                  <SelectValue placeholder={pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 50, 100].map((ps) => (
                    <SelectItem key={ps} value={`${ps}`} className="text-xs">{ps}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {totalRecords > pagination.pageSize && (
              <PaginationRoot
                page={pagination.pageIndex + 1}
                count={totalRecords}
                pageSize={pagination.pageSize}
                onPageChange={(e) => setPagination(prev => ({ ...prev, pageIndex: e.page - 1 }))}
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
    </div>
  );
}
