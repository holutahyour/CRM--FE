"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Egg, LayoutGrid, Loader, Package, ShoppingCart, Wheat } from "lucide-react";
import { SALES_TAB } from "@/lib/routes";
import { SalesTabDef, SalesTabs } from "./_components/ui";
import { SalesDataProvider, useSalesData } from "./_components/use-sales-data";
import DailyProductionTab from "./_components/DailyProductionTab";
import SalesRecordsTab from "./_components/SalesRecordsTab";
import FeedCostTab from "./_components/FeedCostTab";
import StockTab from "./_components/StockTab";
import DashboardTab from "./_components/DashboardTab";

const TABS: SalesTabDef[] = [
  { label: "Daily Production", value: "daily-production", icon: Egg },
  { label: "Sales", value: "sales", icon: ShoppingCart },
  { label: "Feed Cost", value: "feed-cost", icon: Wheat },
  { label: "Stock", value: "stock", icon: Package },
  { label: "Dashboard", value: "dashboard", icon: LayoutGrid },
];

function SalesTabContent({ active }: { active: string }) {
  const { loading } = useSalesData();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
        <Loader className="w-6 h-6 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {active === "daily-production" && <DailyProductionTab />}
      {active === "sales" && <SalesRecordsTab />}
      {active === "feed-cost" && <FeedCostTab />}
      {active === "stock" && <StockTab />}
      {active === "dashboard" && <DashboardTab />}
    </>
  );
}

export default function SalesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requested = searchParams.get(SALES_TAB);
  const active = TABS.some((t) => t.value === requested) ? requested! : TABS[0].value;

  // Switching tab drops any open modal so a record form can't outlive its tab.
  const setActive = useCallback(
    (value: string) => {
      const params = new URLSearchParams();
      params.set(SALES_TAB, value);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router]
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Department</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          EPL Poultry &mdash; production, sales, feed cost, stock &amp; summary
        </p>
      </div>

      <SalesTabs tabs={TABS} active={active} onChange={setActive} />

      <SalesDataProvider>
        <SalesTabContent active={active} />
      </SalesDataProvider>
    </div>
  );
}
