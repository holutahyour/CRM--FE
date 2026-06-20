"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, Loader, Archive, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import apiHandler from "@/data/api/ApiHandler";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { InventoryItem, MOCK_INVENTORY_ITEMS, mapApiToFrontendItem } from "./_components/types";
import LowStockAlerts from "./_components/LowStockAlerts";
import InventoryTable from "./_components/InventoryTable";
import AddItemDrawer from "./_components/AddItemDrawer";
import UpdateItemDrawer from "./_components/UpdateItemDrawer";
import ImportItemsDrawer, { APP_IMPORT_ITEMS_DRAWER } from "./_components/ImportItemsDrawer";

const USE_MOCK = process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true";
const APP_INVENTORY_DRAWER = "inv_drawer";
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function InventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingItem, setUpdatingItem] = useState<InventoryItem | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // URL that opens the add drawer
  const drawerUrl = useModifyQuery(
    null,
    searchParams,
    [{ key: APP_INVENTORY_DRAWER, value: "true" }],
    "set"
  );

  // URL that opens the import drawer
  const importUrl = useModifyQuery(
    null,
    searchParams,
    [{ key: APP_IMPORT_ITEMS_DRAWER, value: "true" }],
    "set"
  );

  const fetchData = useCallback(async () => {
    try {
      if (USE_MOCK) {
        setItems(MOCK_INVENTORY_ITEMS);
        return;
      }
      const res = await apiHandler.items.list(search || undefined);

      if (Array.isArray(res)) {
        setItems(res.map(mapApiToFrontendItem));
      } else if (res?.isSuccess && Array.isArray(res.content)) {
        setItems(res.content.map(mapApiToFrontendItem));
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error("Failed to fetch inventory items", e);
      if (USE_MOCK) setItems(MOCK_INVENTORY_ITEMS);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Reset to page 1 whenever search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleUpdate = (item: InventoryItem) => {
    router.push(`?id=${item.id}&inv_update_drawer=true`, { scroll: false });
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.categoryName || item.category || "").toLowerCase().includes(search.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice((safePage - 1) * pageSize, safePage * pageSize);

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Drawers */}
      <AddItemDrawer
        onCreated={(newItem) => {
          setItems((prev) => [newItem, ...prev]);
          setCurrentPage(1);
        }}
      />
      <UpdateItemDrawer
        item={updatingItem}
        onUpdated={(updatedItem) => {
          setItems((prev) =>
            prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
          );
          fetchData();
        }}
      />
      <ImportItemsDrawer onImported={() => fetchData()} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Archive className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-sm text-gray-500 font-medium">Track and manage inventory stock levels</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(importUrl)}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm active:scale-95"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => router.push(drawerUrl)}
            className="flex items-center gap-2 bg-[#7cc843] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#68a638] transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Alerts Section */}
      <LowStockAlerts items={filteredItems} />

      {/* All Items Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">All Inventory Items</h2>
            <p className="text-sm text-gray-500 font-medium">
              {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} total
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by item name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader className="w-6 h-6 text-green-500 animate-spin" />
              <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">Loading Inventory...</span>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-gray-100 shadow-sm text-gray-400">
            <Archive className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">No inventory items found</p>
            {search && <p className="text-xs mt-1">Try adjusting your search terms</p>}
          </div>
        ) : (
          <>
            <InventoryTable items={paginatedItems} onUpdate={handleUpdate} />

            {/* Pagination Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 pt-1">
              {/* Page size selector */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
                >
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Page info + controls */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredItems.length)} of {filteredItems.length}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={safePage === 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold"
                  >
                    «
                  </button>
                  <button
                    onClick={() => goToPage(safePage - 1)}
                    disabled={safePage === 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page number pills */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-sm">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goToPage(p as number)}
                          className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium border transition-all ${
                            p === safePage
                              ? "bg-green-600 text-white border-green-600 shadow-sm"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}

                  <button
                    onClick={() => goToPage(safePage + 1)}
                    disabled={safePage === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={safePage === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
