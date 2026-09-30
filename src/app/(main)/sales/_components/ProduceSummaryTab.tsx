"use client";

import { useMemo } from "react";
import { intakeAccepted, produceSaleBalance, produceSaleTotal } from "./produce-types";
import { fmtNaira, fmtNumber } from "./types";
import { Card, SectionHeader, StatCard, SummaryRow } from "./ui";
import { useProduceData } from "./use-produce-data";

export default function ProduceSummaryTab() {
  const { intake, sales } = useProduceData();

  const totals = useMemo(() => {
    const accepted = intake.reduce((sum, i) => sum + intakeAccepted(i), 0);
    const rejected = intake.reduce((sum, i) => sum + (i.rejected ?? 0), 0);
    const sold = sales.reduce((sum, s) => sum + (s.quantity ?? 0), 0);
    const revenue = sales.reduce((sum, s) => sum + produceSaleTotal(s), 0);
    const paid = sales.reduce((sum, s) => sum + (s.paid ?? 0), 0);
    const balance = sales.reduce((sum, s) => sum + Math.max(0, produceSaleBalance(s)), 0);
    // Spoilage is what the packhouse rejected — the sheet has no separate column.
    return { accepted, rejected, spoilage: rejected, sold, revenue, paid, balance };
  }, [intake, sales]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Summary"
        subtitle="Aggregated totals from packhouse intake and sales records"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          label="Total Accepted (kg)"
          value={fmtNumber(totals.accepted)}
          hint="from packhouse intake"
          accent="green"
        />
        <StatCard
          label="Total Rejected (kg)"
          value={fmtNumber(totals.rejected)}
          hint="from packhouse intake"
          accent="red"
        />
        <StatCard
          label="Total Spoilage (kg)"
          value={fmtNumber(totals.spoilage)}
          hint="rejected at intake"
          accent="amber"
        />
        <StatCard
          label="Total Sold (kg)"
          value={fmtNumber(totals.sold)}
          hint="from sales records"
          accent="blue"
        />
        <StatCard
          label="Total Revenue (&#8358;)"
          value={fmtNaira(totals.revenue)}
          hint={`Paid: ${fmtNaira(totals.paid)} · Bal: ${fmtNaira(totals.balance)}`}
          accent="green"
        />
      </div>

      <Card title="Summary Breakdown" subtitle="All key metrics at a glance">
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-green-700 mb-1">Packhouse Intake</p>
            <SummaryRow
              label="Total Accepted (kg)"
              value={fmtNumber(totals.accepted)}
              valueClassName="text-green-700"
            />
            <SummaryRow
              label="Total Rejected (kg)"
              value={fmtNumber(totals.rejected)}
              valueClassName="text-red-600"
            />
            <SummaryRow
              label="Total Spoilage (kg)"
              value={fmtNumber(totals.spoilage)}
              valueClassName="text-amber-600"
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-blue-600 mb-1">Sales</p>
            <SummaryRow label="Total Sold (kg)" value={fmtNumber(totals.sold)} />
            <SummaryRow label="Total Revenue (&#8358;)" value={fmtNaira(totals.revenue)} />
            <SummaryRow
              label="Total Paid (&#8358;)"
              value={fmtNaira(totals.paid)}
              valueClassName="text-green-700"
            />
            <SummaryRow
              label="Balance (&#8358;)"
              value={fmtNaira(totals.balance)}
              valueClassName="text-red-600"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
