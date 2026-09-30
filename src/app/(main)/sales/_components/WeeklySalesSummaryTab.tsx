"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { APP_PRODUCE_WEEK_MODAL } from "@/lib/routes";
import { useOperationsModal } from "@/app/(main)/operations/_components/use-operations-modal";
import { produceSaleTotal, weeklyBalance } from "./produce-types";
import { axisDate, fmtDate, fmtNaira } from "./types";
import { AXIS_TICK, EmptyChart, LEGEND_STYLE, PIE_COLORS, TOOLTIP_STYLE } from "./charts";
import {
  Badge,
  Card,
  DeleteRowButton,
  PrimaryButton,
  SectionHeader,
  StatCard,
  TableShell,
} from "./ui";
import { useProduceData } from "./use-produce-data";
import AddWeeklySummaryModal from "./AddWeeklySummaryModal";

const COLUMNS = ["Week Start", "Week End", "Total Sales (₦)", "Total Paid (₦)", "Balance (₦)", ""];

const cell = "px-4 py-3 whitespace-nowrap text-gray-700";
const numCell = `${cell} text-right`;

export default function WeeklySalesSummaryTab() {
  const { weekly, sales, addWeek, removeWeek, submitting } = useProduceData();
  const modal = useOperationsModal(APP_PRODUCE_WEEK_MODAL);

  const handleCreate = async (record: Parameters<typeof addWeek>[0]) => {
    await addWeek(record);
    modal.close();
  };

  const totals = useMemo(() => {
    const revenue = weekly.reduce((sum, w) => sum + (w.totalSales ?? 0), 0);
    const paid = weekly.reduce((sum, w) => sum + (w.totalPaid ?? 0), 0);
    const outstanding = weekly.reduce((sum, w) => sum + Math.max(0, weeklyBalance(w)), 0);
    return { revenue, paid, outstanding };
  }, [weekly]);

  const weeklySeries = useMemo(
    () =>
      [...weekly]
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
        .map((w) => ({
          week: `${axisDate(w.weekStart)} – ${axisDate(w.weekEnd)}`,
          sales: w.totalSales ?? 0,
          paid: w.totalPaid ?? 0,
          balance: weeklyBalance(w),
        })),
    [weekly]
  );

  // Revenue rolled up per category from the individual sales records.
  const categorySeries = useMemo(() => {
    const byCategory = new Map<string, number>();
    sales.forEach((s) =>
      byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + produceSaleTotal(s))
    );
    return [...byCategory.entries()].map(([name, value]) => ({ name, value }));
  }, [sales]);

  return (
    <div className="space-y-6">
      <AddWeeklySummaryModal
        open={modal.isOpen}
        submitting={submitting}
        onCreate={handleCreate}
        onClose={modal.close}
      />

      <SectionHeader
        title="Weekly Sales Summary"
        subtitle="Week-by-week produce sales performance"
        action={
          <PrimaryButton type="button" onClick={() => modal.open()}>
            <Plus className="w-4 h-4" />
            Add Week
          </PrimaryButton>
        }
      />

      <Card title="Weekly Records" subtitle="Weekly sales aggregates">
        <TableShell columns={COLUMNS} isEmpty={weekly.length === 0} emptyMessage="No weekly summaries yet.">
          {weekly.map((w) => {
            const balance = weeklyBalance(w);
            return (
              <tr key={w.id} className="border-t border-gray-100">
                <td className={`${cell} font-medium text-gray-900`}>{fmtDate(w.weekStart)}</td>
                <td className={cell}>{fmtDate(w.weekEnd)}</td>
                <td className={`${numCell} font-semibold text-green-700`}>
                  {fmtNaira(w.totalSales)}
                </td>
                <td className={`${numCell} text-blue-600`}>{fmtNaira(w.totalPaid)}</td>
                <td className={numCell}>
                  <Badge
                    label={fmtNaira(balance)}
                    className={
                      balance > 0 ? "bg-red-600 text-white" : "bg-green-100 text-green-700"
                    }
                  />
                </td>
                <td className={`${cell} text-right`}>
                  <DeleteRowButton
                    label={`Delete week starting ${fmtDate(w.weekStart)}`}
                    onDelete={() => removeWeek(w.id)}
                  />
                </td>
              </tr>
            );
          })}
        </TableShell>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Weekly Dashboard</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Revenue (All Weeks)"
            value={fmtNaira(totals.revenue)}
            accent="green"
          />
          <StatCard label="Total Paid (All Weeks)" value={fmtNaira(totals.paid)} accent="blue" />
          <StatCard
            label="Outstanding Balance"
            value={fmtNaira(totals.outstanding)}
            accent="red"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Weekly Sales vs Paid" subtitle="Sales, paid, and balance by week">
            {weeklySeries.length === 0 ? (
              <EmptyChart message="No weekly data yet" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={weeklySeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: any) => fmtNaira(Number(value))}
                  />
                  <Legend iconType="square" iconSize={10} wrapperStyle={LEGEND_STYLE} />
                  <Bar dataKey="sales" name="Total Sales" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paid" name="Total Paid" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="balance" name="Balance" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Revenue by Product Category" subtitle="Sales revenue split by produce category">
            {categorySeries.length === 0 ? (
              <EmptyChart message="No sales data yet" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: any, name: any) => [fmtNaira(Number(value)), name]}
                  />
                  <Pie
                    data={categorySeries}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label={({ name, percent }: any) =>
                      `${name} ${Math.round((percent ?? 0) * 100)}%`
                    }
                  >
                    {categorySeries.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
