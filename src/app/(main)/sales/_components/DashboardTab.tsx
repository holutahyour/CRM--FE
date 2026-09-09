"use client";

import { useMemo } from "react";
import { BarChart2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  axisDate,
  byDateAsc,
  closingCrates,
  closingEggs,
  feedTotal,
  fmtNaira,
  fmtNumber,
  goodEggs,
  latestStock,
  saleBalance,
  saleTotal,
  totalLoss,
} from "./types";
import { Card, StatCard, SummaryRow } from "./ui";
import { useSalesData } from "./use-sales-data";

const PIE_COLORS = ["#16a34a", "#4ade80", "#f59e0b", "#3b82f6", "#8b5cf6", "#06b6d4"];

const TOOLTIP_STYLE = { borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 };
const AXIS_TICK = { fontSize: 11, fill: "#9ca3af" };
const LEGEND_STYLE = { fontSize: 12, color: "#6b7280", paddingTop: 8 };

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-56 text-gray-400">
      <BarChart2 className="w-8 h-8 opacity-30 mr-2" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

export default function DashboardTab() {
  const { production, sales, feedCosts, stock } = useSalesData();

  const totals = useMemo(() => {
    const produced = production.reduce((sum, p) => sum + (p.totalEggs ?? 0), 0);
    const good = production.reduce((sum, p) => sum + goodEggs(p), 0);
    const losses = production.reduce((sum, p) => sum + totalLoss(p), 0);
    const revenue = sales.reduce((sum, s) => sum + saleTotal(s), 0);
    const paid = sales.reduce((sum, s) => sum + (s.paid ?? 0), 0);
    const outstanding = sales.reduce((sum, s) => sum + Math.max(0, saleBalance(s)), 0);
    const feed = feedCosts.reduce((sum, f) => sum + feedTotal(f), 0);
    const current = latestStock(stock);
    return {
      produced,
      good,
      losses,
      revenue,
      paid,
      outstanding,
      feed,
      closingEggs: current ? closingEggs(current) : 0,
      closingCrates: current ? closingCrates(current) : 0,
      soldEggs: stock.reduce((sum, s) => sum + (s.sold ?? 0), 0),
    };
  }, [production, sales, feedCosts, stock]);

  const productionSeries = useMemo(
    () =>
      byDateAsc(production).map((p) => ({
        date: axisDate(p.date),
        good: goodEggs(p),
        small: p.smallEggs ?? 0,
        loss: totalLoss(p),
      })),
    [production]
  );

  const salesSeries = useMemo(
    () =>
      byDateAsc(sales).map((s) => ({
        date: axisDate(s.date),
        revenue: saleTotal(s),
        paid: s.paid ?? 0,
        balance: saleBalance(s),
      })),
    [sales]
  );

  // Feed spend rolled up per feed type — the pie compares types, not purchases.
  const feedSeries = useMemo(() => {
    const byType = new Map<string, number>();
    feedCosts.forEach((f) => byType.set(f.feedType, (byType.get(f.feedType) ?? 0) + feedTotal(f)));
    return [...byType.entries()].map(([name, value]) => ({ name, value }));
  }, [feedCosts]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Dashboard / Summary</h2>
        <p className="text-sm text-gray-500 mt-0.5">Overview of all poultry operations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Produced"
          value={fmtNumber(totals.produced)}
          hint="eggs"
          accent="green"
        />
        <StatCard
          label="Total Sales Revenue"
          value={fmtNaira(totals.revenue)}
          hint={`Paid: ${fmtNaira(totals.paid)}`}
          accent="blue"
        />
        <StatCard
          label="Total Feed Cost"
          value={fmtNaira(totals.feed)}
          hint="all feed purchases"
          accent="amber"
        />
        <StatCard
          label="Total Loss"
          value={fmtNumber(totals.losses)}
          hint="cracked + bad eggs"
          accent="red"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Outstanding Balance
          </p>
          <p className="text-2xl font-bold text-red-600 mt-2">{fmtNaira(totals.outstanding)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Good Eggs Produced
          </p>
          <p className="text-2xl font-bold text-green-700 mt-2">{fmtNumber(totals.good)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Current Closing Stock
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {fmtNumber(totals.closingEggs)} eggs
          </p>
          <p className="text-xs text-gray-500 mt-1">{fmtNumber(totals.closingCrates)} crates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Daily Production Breakdown" subtitle="Good eggs vs losses over time">
          {productionSeries.length === 0 ? (
            <EmptyChart message="No production data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={productionSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="square" iconSize={10} wrapperStyle={LEGEND_STYLE} />
                <Bar dataKey="good" name="Good Eggs" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="small" name="Small Eggs" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="loss" name="Total Loss" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Sales Performance" subtitle="Revenue, paid, and outstanding balance">
          {salesSeries.length === 0 ? (
            <EmptyChart message="No sales data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={salesSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: any) => fmtNaira(Number(value))}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={LEGEND_STYLE} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#16a34a" strokeWidth={2} />
                <Line type="monotone" dataKey="paid" name="Paid" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="balance" name="Balance" stroke="#f87171" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Feed Cost Breakdown" subtitle="Spending by feed type">
          {feedSeries.length === 0 ? (
            <EmptyChart message="No feed cost data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: any, name: any) => [fmtNaira(Number(value)), name]}
                />
                <Pie
                  data={feedSeries}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label={({ name, percent }: any) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                >
                  {feedSeries.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Module Summaries" subtitle="Totals across all modules">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-green-700 mb-1">Production</p>
              <SummaryRow label="Total Eggs Produced" value={fmtNumber(totals.produced)} />
              <SummaryRow label="Good Eggs" value={fmtNumber(totals.good)} />
              <SummaryRow
                label="Total Losses"
                value={fmtNumber(totals.losses)}
                valueClassName="text-red-600"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-blue-600 mb-1">Sales</p>
              <SummaryRow label="Gross Revenue" value={fmtNaira(totals.revenue)} />
              <SummaryRow
                label="Amount Paid"
                value={fmtNaira(totals.paid)}
                valueClassName="text-blue-600"
              />
              <SummaryRow
                label="Outstanding"
                value={fmtNaira(totals.outstanding)}
                valueClassName="text-red-600"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-amber-600 mb-1">Feed Cost</p>
              <SummaryRow
                label="Total Feed Expenditure"
                value={fmtNaira(totals.feed)}
                valueClassName="text-amber-600"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Stock</p>
              <SummaryRow label="Eggs Sold" value={fmtNumber(totals.soldEggs)} />
              <SummaryRow label="Closing Stock (eggs)" value={fmtNumber(totals.closingEggs)} />
              <SummaryRow label="Closing Stock (crates)" value={fmtNumber(totals.closingCrates)} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
