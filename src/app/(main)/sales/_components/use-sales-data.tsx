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
  SaleRecord,
  StockRecord,
} from "./types";
import { USE_MOCK, asList, useRecordStore } from "./use-record-store";

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

export function SalesDataProvider({ children }: { children: React.ReactNode }) {
  const [production, setProduction] = useState<DailyProduction[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [feedCosts, setFeedCosts] = useState<FeedCostRecord[]>([]);
  const [stock, setStock] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { submitting, create, remove } = useRecordStore();

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
