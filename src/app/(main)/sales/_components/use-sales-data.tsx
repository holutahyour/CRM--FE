"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import apiHandler from "@/data/api/ApiHandler";
import {
  DailyProduction,
  FeedCostRecord,
  MOCK_FEED_COSTS,
  MOCK_PRODUCTION,
  MOCK_SALES,
  MOCK_STOCK,
  SAVE_FAILED,
  SaleRecord,
  StockRecord,
} from "./types";

const USE_MOCK = process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true";

/**
 * All four Sales datasets live in one provider: the Dashboard tab summarises
 * every other tab, so a record added on one tab has to be visible to the rest
 * without a refetch.
 */
interface SalesData {
  production: DailyProduction[];
  sales: SaleRecord[];
  feedCosts: FeedCostRecord[];
  stock: StockRecord[];
  loading: boolean;
  submitting: boolean;
  addProduction: (record: Omit<DailyProduction, "id">) => Promise<void>;
  addSale: (record: Omit<SaleRecord, "id">) => Promise<void>;
  addFeedCost: (record: Omit<FeedCostRecord, "id">) => Promise<void>;
  addStock: (record: Omit<StockRecord, "id">) => Promise<void>;
  removeProduction: (id: string) => Promise<void>;
  removeSale: (id: string) => Promise<void>;
  removeFeedCost: (id: string) => Promise<void>;
  removeStock: (id: string) => Promise<void>;
}

const SalesDataContext = createContext<SalesData | null>(null);

const asList = <T,>(res: any): T[] | undefined =>
  res?.isSuccess && Array.isArray(res.content) ? (res.content as T[]) : undefined;

/** Newest-dated record last, matching the order the tables read in. */
const insert = <T extends { date: string }>(rows: T[], row: T) =>
  [...rows, row].sort((a, b) => a.date.localeCompare(b.date));

export function SalesDataProvider({ children }: { children: React.ReactNode }) {
  const [production, setProduction] = useState<DailyProduction[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [feedCosts, setFeedCosts] = useState<FeedCostRecord[]>([]);
  const [stock, setStock] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      if (USE_MOCK) {
        setProduction(MOCK_PRODUCTION);
        setSales(MOCK_SALES);
        setFeedCosts(MOCK_FEED_COSTS);
        setStock(MOCK_STOCK);
        return;
      }
      const [productionRes, salesRes, feedRes, stockRes] = await Promise.all([
        apiHandler.sales.listProduction(),
        apiHandler.sales.listSales(),
        apiHandler.sales.listFeedCosts(),
        apiHandler.sales.listStock(),
      ]);
      const p = asList<DailyProduction>(productionRes);
      const s = asList<SaleRecord>(salesRes);
      const f = asList<FeedCostRecord>(feedRes);
      const st = asList<StockRecord>(stockRes);
      if (p) setProduction(p);
      if (s) setSales(s);
      if (f) setFeedCosts(f);
      if (st) setStock(st);
    } catch (e) {
      console.error("Failed to fetch sales data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  /**
   * Create through the API when it is live, otherwise fall back to a local id.
   *
   * Nothing reaches the table until the API confirms the record was stored — a
   * refused save has to raise, or the tab would show a row that only exists in
   * this browser and disappears on the next refresh. The message thrown is the
   * one the form shows, so it carries the API's reason when it gives one.
   */
  const create = useCallback(
    async <T extends { id: string; date: string }>(
      record: Omit<T, "id">,
      prefix: string,
      call: (data: any) => Promise<any>,
      setRows: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
      setSubmitting(true);
      try {
        let created = { ...record, id: `${prefix}-${Date.now()}` } as T;
        if (!USE_MOCK) {
          let res: any;
          try {
            res = await call(record);
          } catch (e) {
            // A transport failure has no reason worth showing the user.
            console.error(`Failed to add ${prefix} record`, e);
            throw new Error(SAVE_FAILED);
          }
          if (!res?.isSuccess) throw new Error(res?.message?.trim() || SAVE_FAILED);
          if (res.content) created = res.content as T;
        }
        setRows((prev) => insert(prev, created));
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  /** Optimistic delete — the row goes immediately and comes back if the API refuses. */
  const remove = useCallback(
    async <T extends { id: string }>(
      id: string,
      rows: T[],
      call: (id: string) => Promise<any>,
      setRows: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
      const snapshot = rows;
      setRows(rows.filter((r) => r.id !== id));
      if (USE_MOCK) return;
      try {
        const res = await call(id);
        if (res && res.isSuccess === false) setRows(snapshot);
      } catch (e) {
        console.error("Failed to delete record", e);
        setRows(snapshot);
      }
    },
    []
  );

  const value: SalesData = {
    production,
    sales,
    feedCosts,
    stock,
    loading,
    submitting,
    addProduction: (r) =>
      create<DailyProduction>(r, "prod", apiHandler.sales.createProduction, setProduction),
    addSale: (r) => create<SaleRecord>(r, "sale", apiHandler.sales.createSale, setSales),
    addFeedCost: (r) =>
      create<FeedCostRecord>(r, "feed", apiHandler.sales.createFeedCost, setFeedCosts),
    addStock: (r) => create<StockRecord>(r, "stock", apiHandler.sales.createStock, setStock),
    removeProduction: (id) =>
      remove<DailyProduction>(id, production, apiHandler.sales.deleteProduction, setProduction),
    removeSale: (id) => remove<SaleRecord>(id, sales, apiHandler.sales.deleteSale, setSales),
    removeFeedCost: (id) =>
      remove<FeedCostRecord>(id, feedCosts, apiHandler.sales.deleteFeedCost, setFeedCosts),
    removeStock: (id) => remove<StockRecord>(id, stock, apiHandler.sales.deleteStock, setStock),
  };

  return <SalesDataContext.Provider value={value}>{children}</SalesDataContext.Provider>;
}

export function useSalesData() {
  const ctx = useContext(SalesDataContext);
  if (!ctx) throw new Error("useSalesData must be used inside a SalesDataProvider");
  return ctx;
}
