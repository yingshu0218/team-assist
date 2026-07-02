"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/constants";
import type { Ledger, StatsResponse } from "@/lib/types";

interface OverviewChartsProps {
  ledgers: Ledger[];
  trendLedgerId: number | null;
  expenseLedgerId: number | null;
  trendStats: StatsResponse | null;
  expenseStats: StatsResponse | null;
  trendLoading: boolean;
  expenseLoading: boolean;
  onTrendLedgerChange: (ledgerId: number) => void;
  onExpenseLedgerChange: (ledgerId: number) => void;
}

const PIE_COLORS = [
  "#059669",
  "#3B82F6",
  "#EC4899",
  "#F59E0B",
  "#8B5CF6",
  "#14B8A6",
  "#EF4444",
  "#6B7280",
  "#F97316",
  "#0891B2",
];

function getThemeColor(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

function LedgerSelect({
  ledgers,
  value,
  onValueChange,
}: {
  ledgers: Ledger[];
  value: number | null;
  onValueChange: (ledgerId: number) => void;
}) {
  return (
    <Select value={value === null ? undefined : String(value)} onValueChange={(id) => onValueChange(Number(id))}>
      <SelectTrigger size="sm" className="max-w-36 h-8 text-xs">
        <SelectValue placeholder="选择账本" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {ledgers.map((ledger) => (
            <SelectItem key={ledger.id} value={String(ledger.id)}>
              {ledger.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

// 自定义 Tooltip 组件
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-card/95 px-3 py-2 shadow-float backdrop-blur-md">
      {label && <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground">{entry.name}</span>
          <span className="font-display text-xs font-bold tnum text-foreground">
            ¥{formatCurrency(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function OverviewCharts({
  ledgers,
  trendLedgerId,
  expenseLedgerId,
  trendStats,
  expenseStats,
  trendLoading,
  expenseLoading,
  onTrendLedgerChange,
  onExpenseLedgerChange,
}: OverviewChartsProps) {
  const dailyTrend = trendStats?.dailyTrend || [];
  const categoryBreakdown = expenseStats?.categoryBreakdown || [];

  const recentTrend = dailyTrend.slice(-30).map((d) => ({
    ...d,
    date: d.date.slice(5),
  }));

  const pieData = categoryBreakdown.slice(0, 8).map((c) => ({
    name: c.category_name,
    value: c.total,
    color: c.color || PIE_COLORS[0],
  }));

  const gridStroke = typeof window !== "undefined" ? getThemeColor("--border", "#e4e4e7") : "#e4e4e7";
  const tickFill = typeof window !== "undefined" ? getThemeColor("--muted-foreground", "#71717A") : "#71717A";

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {/* 收支趋势图 */}
      <Card className="border-border/50 shadow-soft lg:col-span-2">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">收支趋势</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">最近 30 天</p>
            </div>
            <LedgerSelect ledgers={ledgers} value={trendLedgerId} onValueChange={onTrendLedgerChange} />
          </div>
          {trendLoading ? (
            <div className="h-64 shimmer rounded-xl" />
          ) : recentTrend.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={recentTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} opacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: tickFill, fontFamily: "Manrope" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: tickFill, fontFamily: "Manrope" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(0.965 0.008 110 / 0.3)" }} />
                <Legend
                  wrapperStyle={{ fontSize: 12, fontFamily: "Manrope", paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="income" name="收入" fill="#16A34A" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" name="支出" fill="#DC2626" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 分类占比图 */}
      <Card className="border-border/50 shadow-soft">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">支出分类</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">占比分布</p>
            </div>
            <LedgerSelect ledgers={ledgers} value={expenseLedgerId} onValueChange={onExpenseLedgerChange} />
          </div>
          {expenseLoading ? (
            <div className="h-64 shimmer rounded-xl" />
          ) : pieData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, fontFamily: "Manrope" }}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => {
                    const item = pieData.find((d) => d.name === value);
                    const total = pieData.reduce((sum, d) => sum + d.value, 0);
                    const pct = item ? ((item.value / total) * 100).toFixed(1) : "0";
                    return `${value} ${pct}%`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
