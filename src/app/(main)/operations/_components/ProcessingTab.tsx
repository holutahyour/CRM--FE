"use client";

import { OPERATIONS_SUB_TAB } from "@/lib/routes";
import { SubTabs, TabDef } from "./ui";
import { useTabParam } from "./use-operations-modal";
import BatchSchedulingSection from "./processing/BatchSchedulingSection";
import OrderRequestsSection from "./processing/OrderRequestsSection";
import YieldLogSection from "./processing/YieldLogSection";
import MaterialStockSection from "./processing/MaterialStockSection";
import ProductsSection from "./processing/ProductsSection";
import MachineUsageSection from "./processing/MachineUsageSection";

/**
 * Operations → Processing: every sheet of the Batch Production Scheduling workbook, plus
 * machine usage. Batch Scheduling stays the default so existing links keep landing there.
 */
const SUB_TABS: TabDef[] = [
  { label: "Batch Scheduling", value: "batch-scheduling" },
  { label: "Order Requests", value: "order-requests" },
  { label: "Yield Log", value: "yield-log" },
  { label: "Material Stock", value: "material-stock" },
  { label: "Products", value: "products" },
  { label: "Machine Usage Logs", value: "machine-usage-logs" },
];

const SECTIONS: Record<string, () => React.JSX.Element> = {
  "batch-scheduling": BatchSchedulingSection,
  "order-requests": OrderRequestsSection,
  "yield-log": YieldLogSection,
  "material-stock": MaterialStockSection,
  products: ProductsSection,
  "machine-usage-logs": MachineUsageSection,
};

export default function ProcessingTab() {
  const { active, setActive } = useTabParam(OPERATIONS_SUB_TAB, SUB_TABS[0].value);
  const activeSub = SUB_TABS.some((t) => t.value === active) ? active : SUB_TABS[0].value;
  const Section = SECTIONS[activeSub];

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <SubTabs tabs={SUB_TABS} active={activeSub} onChange={setActive} />
      </div>
      <Section />
    </div>
  );
}
