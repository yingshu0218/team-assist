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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// 从 CSS 变量获取当前主题色
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
      <SelectTrigger size="sm" className="max-w-36">
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

  // 最多显示最近30天的趋势数据
  const recentTrend = dailyTrend.slice(-30).map((d) => ({
    ...d,
    date: d.date.slice(5), // MM-DD
  }));

  // 分类饼图数据
  const pieData = categoryBreakdown.slice(0, 8).map((c) => ({
    name: c.category_name,
    value: c.total,
    color: c.color || PIE_COLORS[0],
  }));

  // 自适应主题色的配置
  const gridStroke = typeof window !== "undefined" ? getThemeColor("--border", "#e4e4e7") : "#e4e4e7";
  const tickFill = typeof window !== "undefined" ? getThemeColor("--muted-foreground", "#71717A") : "#71717A";
  const tooltipBg = typeof window !== "undefined" ? getThemeColor("--card", "#ffffff") : "#ffffff";
  const tooltipBorder = typeof window !== "undefined" ? getThemeColor("--border", "#e4e4e7") : "#e4e4e7";
  const tooltipText = typeof window !== "undefined" ? getThemeColor("--foreground", "#18181B") : "#18181B";

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {/* 收支趋势图 */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">收支趋势</CardTitle>
            <LedgerSelect ledgers={ledgers} value={trendLedgerId} onValueChange={onTrendLedgerChange} />
          </div>
        </CardHeader>
        <CardContent className="pl-2">
          {trendLoading ? (
            <div className="h-64 animate-pulse rounded bg-muted" />
          ) : recentTrend.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={recentTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: tickFill }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: tickFill }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: `1px solid ${tooltipBorder}`,
                    fontSize: 12,
                    backgroundColor: tooltipBg,
                    color: tooltipText,
                  }}
                  formatter={(value: number) => [`¥${formatCurrency(value)}`, undefined]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="income" name="收入" fill="#16A34A" radius={[3, 3, 0, 0]} maxBarSize={32} />
                <Bar dataKey="expense" name="支出" fill="#DC2626" radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 分类占比图 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">支出分类占比</CardTitle>
            <LedgerSelect ledgers={ledgers} value={expenseLedgerId} onValueChange={onExpenseLedgerChange} />
          </div>
        </CardHeader>
        <CardContent>
          {expenseLoading ? (
            <div className="h-64 animate-pulse rounded bg-muted" />
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
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: `1px solid ${tooltipBorder}`,
                    fontSize: 12,
                    backgroundColor: tooltipBg,
                    color: tooltipText,
                  }}
                  formatter={(value: number) => [`¥${formatCurrency(value)}`, undefined]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
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
