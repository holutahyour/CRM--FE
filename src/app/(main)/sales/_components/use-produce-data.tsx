"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import apiHandler from "@/data/api/ApiHandler";
import {
  MOCK_INTAKE,
  MOCK_PRODUCE_SALES,
  MOCK_WEEKLY,
  PackhouseIntake,
  ProduceSale,
  WeeklySummary,
} from "./produce-types";
import { USE_MOCK, asList, useRecordStore } from "./use-record-store";

/**
 * The three Fresh Produce datasets share one provider because the Summary and
 * Weekly Sales Summary tabs read across the others.
 */
interface ProduceData {
  intake: PackhouseIntake[];
  sales: ProduceSale[];
  weekly: WeeklySummary[];
  loading: boolean;
  submitting: boolean;
  addIntake: (record: Omit<PackhouseIntake, "id">) => Promise<void>;
  addSale: (record: Omit<ProduceSale, "id">) => Promise<void>;
  addWeek: (record: Omit<WeeklySummary, "id">) => Promise<void>;
  removeIntake: (id: string) => Promise<void>;
  removeSale: (id: string) => Promise<void>;
  removeWeek: (id: string) => Promise<void>;
}

const ProduceDataContext = createContext<ProduceData | null>(null);

const byWeekStart = (w: WeeklySummary) => w.weekStart;

export function ProduceDataProvider({ children }: { children: React.ReactNode }) {
  const [intake, setIntake] = useState<PackhouseIntake[]>([]);
  const [sales, setSales] = useState<ProduceSale[]>([]);
  const [weekly, setWeekly] = useState<WeeklySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { submitting, create, remove } = useRecordStore();

  const fetchData = useCallback(async () => {
    try {
      if (USE_MOCK) {
        setIntake(MOCK_INTAKE);
        setSales(MOCK_PRODUCE_SALES);
        setWeekly(MOCK_WEEKLY);
        return;
      }
      const [intakeRes, salesRes, weeklyRes] = await Promise.all([
        apiHandler.sales.listProduceIntake(),
        apiHandler.sales.listProduceSales(),
        apiHandler.sales.listProduceWeekly(),
      ]);
      const i = asList<PackhouseIntake>(intakeRes);
      const s = asList<ProduceSale>(salesRes);
      const w = asList<WeeklySummary>(weeklyRes);
      if (i) setIntake(i);
      if (s) setSales(s);
      if (w) setWeekly(w);
    } catch (e) {
      console.error("Failed to fetch fresh produce data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const value: ProduceData = {
    intake,
    sales,
    weekly,
    loading,
    submitting,
    addIntake: (r) =>
      create<PackhouseIntake>(r, "intake", apiHandler.sales.createProduceIntake, setIntake),
    addSale: (r) =>
      create<ProduceSale>(r, "psale", apiHandler.sales.createProduceSale, setSales),
    addWeek: (r) =>
      create<WeeklySummary>(r, "week", apiHandler.sales.createProduceWeekly, setWeekly, byWeekStart),
    removeIntake: (id) =>
      remove<PackhouseIntake>(id, intake, apiHandler.sales.deleteProduceIntake, setIntake),
    removeSale: (id) =>
      remove<ProduceSale>(id, sales, apiHandler.sales.deleteProduceSale, setSales),
    removeWeek: (id) =>
      remove<WeeklySummary>(id, weekly, apiHandler.sales.deleteProduceWeekly, setWeekly),
  };

  return <ProduceDataContext.Provider value={value}>{children}</ProduceDataContext.Provider>;
}

export function useProduceData() {
  const ctx = useContext(ProduceDataContext);
  if (!ctx) throw new Error("useProduceData must be used inside a ProduceDataProvider");
  return ctx;
}
