"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Package, Plus, Loader, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import apiHandler from "@/data/api/ApiHandler";
import ItemRequestCard from "./_components/ItemRequestCard";
import CreateItemRequestDrawer from "./_components/CreateItemRequestDrawer";
import RejectModal from "../requisitions/_components/RejectModal";
import { ItemRequest, MOCK_ITEM_REQUESTS } from "./_components/types";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { APP_ITEM_REQUEST_DRAWER } from "@/lib/routes";
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
const FILTERS = [{ key: "All", value: 0 }, { key: "Pending", value: 1 }, { key: "Approved", value: 2 }, { key: "Rejected", value: 3 }];

export default function ItemRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState(0);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);
  // Incremented after every approve/reject to make cards re-fetch their approval history
  const [approvalVersion, setApprovalVersion] = useState(0);

  const [totalRecords, setTotalRecords] = useState(0);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const skipFetchRef = useRef(false);

  // URL that opens the drawer
  const drawerUrl = useModifyQuery(
    null,
    searchParams,
    [{ key: APP_ITEM_REQUEST_DRAWER, value: "true" }],
    "set"
  );

  const fetchData = useCallback(async () => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }
    try {
      if (USE_MOCK) {
        // If the mock array has string statuses, let's map them to numbers just to match filters, or use the exact logic from requisitions
        // MOCK_ITEM_REQUESTS uses strings "Pending", "Approved", "Rejected". 
        // 1=Pending, 2=Approved, 3=Rejected
        const statusMap: Record<string, number> = { "Pending": 1, "Approved": 2, "Rejected": 3 };
        const mockFiltered =
          activeFilter === 0
            ? MOCK_ITEM_REQUESTS
            : MOCK_ITEM_REQUESTS.filter((r) => r.status === activeFilter || statusMap[r.status as string] === activeFilter);
        setRequests(mockFiltered);
        setTotalRecords(mockFiltered.length);
        return;
      }
      
      const res = await apiHandler.itemRequests.list({
        status: activeFilter !== 0 ? `${activeFilter}` : undefined,
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      });

      if (Array.isArray(res)) {
        setRequests(res);
        setTotalRecords(res.length);
      } else if (res?.isSuccess && Array.isArray(res.content)) {
        setRequests(res.content);
        if (res.metaData?.total) {
          setTotalRecords(res.metaData.total);
        } else {
          setTotalRecords(res.content.length);
        }
      } else if (res?.isSuccess && res.content && typeof res.content === "object") {
        const items = (res.content as any).items ?? (res.content as any).data ?? [];
        const itemsArray = Array.isArray(items) ? items : [];
        setRequests(itemsArray);
        if (res.metaData?.total) {
          setTotalRecords(res.metaData.total);
        } else {
          setTotalRecords(itemsArray.length);
        }
      } else {
        setRequests([]);
        setTotalRecords(0);
      }
    } catch (e) {
      console.error("Failed to fetch item requests", e);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [activeFilter, pagination.pageIndex, pagination.pageSize, fetchData]); // fetch on filter/page change

  const handleApprove = async (id: string) => {
    setActionBusy(id);
    try {
      const res = await apiHandler.itemRequests.approve(id);
      // Use the server's actual updated status instead of assuming "Approved"
      // (multi-step workflows stay Pending until the last step is approved)
      if (res?.isSuccess && res.content) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...res.content } : r))
        );
      } else {
        // Fallback: reload all data from the server
        setLoading(true);
        fetchData();
      }
      setApprovalVersion((v) => v + 1);
    } catch (e) {
      console.error("Approve failed", e);
    } finally {
      setActionBusy(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    setRejectBusy(true);
    try {
      const res = await apiHandler.itemRequests.reject(rejectTarget, reason);
      if (res?.isSuccess && res.content) {
        setRequests((prev) =>
          prev.map((r) => (r.id === rejectTarget ? { ...r, ...res.content } : r))
        );
      } else {
        setLoading(true);
        fetchData();
      }
      setApprovalVersion((v) => v + 1);
      setRejectTarget(null);
    } catch (e) {
      console.error("Reject failed", e);
    } finally {
      setRejectBusy(false);
    }
  };

  const filtered = requests.filter((r) =>
    (r.itemName || r.title || r.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Reject Modal */}
      {rejectTarget && (
        <RejectModal
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
          busy={rejectBusy}
        />
      )}

      {/* Create Drawer */}
      <CreateItemRequestDrawer
        onCreated={(req) => {
          skipFetchRef.current = true;
          const newReq = { ...req, status: 1 as const };
          setRequests((prev) => [newReq, ...prev]);
          setTotalRecords((prev) => prev + 1);
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Item Requests</h1>
            <p className="text-sm text-gray-500">Manage item requests to inventory officer</p>
          </div>
        </div>
        <button
          onClick={() => router.push(drawerUrl)}
          className="flex items-center gap-2 bg-[#7cc843] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#68a638] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
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
            placeholder="Search item requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* List */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
            <Loader className="w-6 h-6 text-green-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm text-gray-400">
            <Package className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No item requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r) => (
              <ItemRequestCard
                key={r.id}
                req={r}
                onApprove={handleApprove}
                onReject={(id) => setRejectTarget(id)}
                actionBusy={actionBusy}
                refreshKey={approvalVersion}
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
