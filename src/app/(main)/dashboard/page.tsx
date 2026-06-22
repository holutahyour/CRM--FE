"use client";

import React, { useState, useEffect } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";
import { LowStockList } from "@/components/dashboard/LowStockList";
import { Clock, CheckCircle, Package, TrendingUp, AlertTriangle, FileText, Laptop, Printer } from "lucide-react";
import apiHandler from "@/data/api/ApiHandler";
import { useAzureAuth } from "@/context/auth-context";

const USE_MOCK = process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true";

export default function DashboardPage() {
  const { user } = useAzureAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(
    USE_MOCK
      ? { pending: 12, approved: 45, itemRequests: 8, monthlyGoals: 85, lowStock: 5, openIncidents: 3 }
      : { pending: 0, approved: 0, itemRequests: 0, monthlyGoals: 0, lowStock: 0, openIncidents: 0 }
  );

  const [recentActivity, setRecentActivity] = useState<any[]>(USE_MOCK ? [
    {
      id: "1",
      title: "Office Supplies Request",
      department: "Marketing",
      status: "pending" as const,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      icon: FileText
    },
    {
      id: "2",
      title: "Laptop Request",
      department: "Sales",
      status: "approved" as const,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      icon: Laptop
    },
    {
      id: "3",
      title: "Printer Malfunction",
      department: "Operations",
      status: "in_progress" as const,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      icon: Printer
    }
  ] : []);

  const [lowStockItems, setLowStockItems] = useState(USE_MOCK ? [
    { id: "1", name: "A4 Paper", minRequired: "50 reams", currentQuantity: 15 },
    { id: "2", name: "Toner Cartridge (Black)", minRequired: "10 units", currentQuantity: 3 },
    { id: "3", name: "USB Flash Drives", minRequired: "20 units", currentQuantity: 8 },
    { id: "4", name: "Notebooks", minRequired: "100 units", currentQuantity: 25 },
    { id: "5", name: "Pens (Blue)", minRequired: "200 units", currentQuantity: 30 },
  ] : []);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [summaryRes, activitiesRes, lowStockRes] = await Promise.all([
          apiHandler.dashboard.getSummary().catch(() => null),
          apiHandler.dashboard.getActivities({ pageSize: 5, orderBy: "timestamp", orderDirection: 'Desc' }).catch(() => null),
          apiHandler.dashboard.getLowStockItems({ pageSize: 5 }).catch(() => null),
        ]);

        if (summaryRes?.isSuccess && summaryRes.content && Array.isArray(summaryRes.content) && summaryRes.content.length > 0) {
          const s = summaryRes.content[0];
          setStats({
            pending: s.pendingRequisitions || 0,
            approved: s.approvedRequisitions || 0,
            itemRequests: s.itemRequests || 0,
            monthlyGoals: s.monthlyGoalsAchieved || 0,
            lowStock: s.lowStock || 0,
            openIncidents: s.openIncidents || 0
          });
        }

        if (activitiesRes?.isSuccess && activitiesRes.content && Array.isArray(activitiesRes.content)) {
          const acts = activitiesRes.content.map((a: any) => ({
            id: a.id || Math.random().toString(),
            title: a.description || "Activity",
            department: a.department?.name || "General",
            status: a.status || "pending",
            createdAt: a.timestamp || new Date().toISOString(),
            icon: FileText
          }));
          if (!USE_MOCK || acts.length > 0) setRecentActivity(acts);
        } else if (!USE_MOCK) {
          setRecentActivity([]);
        }

        if (lowStockRes?.isSuccess && lowStockRes.content && Array.isArray(lowStockRes.content)) {
          const items = lowStockRes.content.map((i: any) => ({
            id: i.id || Math.random().toString(),
            name: i.name || "Item",
            minRequired: i.minStockLevel || i.reorderQuantity || 10,
            currentQuantity: i.quantityOnHand || i.currentQuantity || 0
          }));
          if (!USE_MOCK || items.length > 0) setLowStockItems(items);
        } else if (!USE_MOCK) {
          setLowStockItems([]);
        }
      } catch (error) {
        console.error("Dashboard Fetch Error", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const userName = user?.name || (USE_MOCK ? "John Admin" : "");

  return (
    <div className="flex-1 space-y-6 p-1">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Dashboard</h2>
        <p className="text-sm text-muted-foreground text-gray-500 dark:text-gray-400">{userName ? `Welcome back, ${userName}` : "Welcome back"}</p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Requisitions"
          value={stats.pending}
          subtitle="Awaiting approval"
          icon={Clock}
          iconColor="text-orange-500"
        />
        <StatCard
          title="Approved Requisitions"
          value={stats.approved}
          subtitle="This month"
          icon={CheckCircle}
          iconColor="text-green-500"
        />
        <StatCard
          title="Item Requests"
          value={stats.itemRequests}
          subtitle="Pending approval"
          icon={Package}
          iconColor="text-blue-500"
        />
        <StatCard
          title="Monthly Goals"
          value={`${stats.monthlyGoals}%`}
          subtitle="Goals achieved"
          icon={TrendingUp}
          iconColor="text-green-500"
        />
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <StatCard
            title="Low Stock Items"
            value={stats.lowStock}
            subtitle="Need restocking"
            icon={AlertTriangle}
            iconColor="text-red-500"
          />
          <StatCard
            title="Open Incidents"
            value={stats.openIncidents}
            subtitle="Active reports"
            icon={AlertTriangle}
            iconColor="text-orange-500"
          />
        </div>
        <div className="hidden lg:col-span-2 lg:block"></div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <RecentActivityList activities={recentActivity} />
        <LowStockList items={lowStockItems} />
      </div>
    </div>
  );
}
