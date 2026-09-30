"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  Egg,
  LayoutGrid,
  Leaf,
  Package,
  ShoppingCart,
  Wheat,
} from "lucide-react";
import { SALES_DIVISION, SALES_TAB } from "@/lib/routes";
import { SalesTabDef, SalesTabs, TabLoader } from "./_components/ui";
import { SalesDataProvider, useSalesData } from "./_components/use-sales-data";
import { ProduceDataProvider, useProduceData } from "./_components/use-produce-data";
import DailyProductionTab from "./_components/DailyProductionTab";
import SalesRecordsTab from "./_components/SalesRecordsTab";
import FeedCostTab from "./_components/FeedCostTab";
import StockTab from "./_components/StockTab";
import DashboardTab from "./_components/DashboardTab";
import PackhouseIntakeTab from "./_components/PackhouseIntakeTab";
import ProduceSummaryTab from "./_components/ProduceSummaryTab";
import ProduceSalesTab from "./_components/ProduceSalesTab";
import WeeklySalesSummaryTab from "./_components/WeeklySalesSummaryTab";

const PRODUCE = "produce";

const DIVISIONS: SalesTabDef[] = [
  { label: "EPL Poultry", value: "poultry", icon: Egg },
  { label: "Fresh Produce", value: PRODUCE, icon: Leaf },
];

const POULTRY_TABS: SalesTabDef[] = [
  { label: "Daily Production", value: "daily-production", icon: Egg },
  { label: "Sales", value: "sales", icon: ShoppingCart },
  { label: "Feed Cost", value: "feed-cost", icon: Wheat },
  { label: "Stock", value: "stock", icon: Package },
  { label: "Dashboard", value: "dashboard", icon: LayoutGrid },
];

const PRODUCE_TABS: SalesTabDef[] = [
  { label: "Packhouse Intake", value: "packhouse-intake", icon: ClipboardList },
  { label: "Summary", value: "summary", icon: Package },
  { label: "Sales", value: "sales", icon: ShoppingCart },
  { label: "Weekly Sales Summary", value: "weekly-summary", icon: CalendarDays },
];

function PoultryTabContent({ active }: { active: string }) {
  const { loading } = useSalesData();
  if (loading) return <TabLoader />;

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

function ProduceTabContent({ active }: { active: string }) {
  const { loading } = useProduceData();
  if (loading) return <TabLoader />;

  return (
    <>
      {active === "packhouse-intake" && <PackhouseIntakeTab />}
      {active === "summary" && <ProduceSummaryTab />}
      {active === "sales" && <ProduceSalesTab />}
      {active === "weekly-summary" && <WeeklySalesSummaryTab />}
    </>
  );
}

export default function SalesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isProduce = searchParams.get(SALES_DIVISION) === PRODUCE;
  const division = isProduce ? PRODUCE : DIVISIONS[0].value;
  const tabs = isProduce ? PRODUCE_TABS : POULTRY_TABS;

  const requested = searchParams.get(SALES_TAB);
  const active = tabs.some((t) => t.value === requested) ? requested! : tabs[0].value;

  // Every switch rebuilds the query from scratch, so an open modal can't outlive
  // its tab and a new division opens on its first section. Poultry is the
  // default, so it leaves the division out of the URL.
  const navigate = useCallback(
    (nextDivision: string, tab?: string) => {
      const params = new URLSearchParams();
      if (nextDivision === PRODUCE) params.set(SALES_DIVISION, PRODUCE);
      if (tab) params.set(SALES_TAB, tab);
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Department</h1>
        <p className="text-sm text-gray-500 mt-0.5">EPL Poultry &amp; Fresh Produce management</p>
      </div>

      <SalesTabs
        ariaLabel="Division"
        tabs={DIVISIONS}
        active={division}
        onChange={(value) => navigate(value)}
      />

      <p className="text-base font-semibold text-gray-500">
        {isProduce ? (
          <>Fresh Produce &mdash; packhouse intake, sales, weekly summary &amp; dashboard</>
        ) : (
          <>EPL Poultry &mdash; production, sales, feed cost, stock &amp; summary</>
        )}
      </p>

      <SalesTabs
        ariaLabel={isProduce ? "Fresh Produce sections" : "EPL Poultry sections"}
        tabs={tabs}
        active={active}
        onChange={(value) => navigate(division, value)}
      />

      {isProduce ? (
        <ProduceDataProvider>
          <ProduceTabContent active={active} />
        </ProduceDataProvider>
      ) : (
        <SalesDataProvider>
          <PoultryTabContent active={active} />
        </SalesDataProvider>
      )}
    </div>
  );
}
