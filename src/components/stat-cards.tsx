"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, Wallet, Receipt, Scale } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import type { StatsResponse } from "@/lib/types";

interface StatCardsProps {
  stats: StatsResponse | null;
  loading: boolean;
  initialBalance?: number;
}

export function StatCards({ stats, loading, initialBalance = 0 }: StatCardsProps) {
  const totalIncome = stats?.totalIncome ?? 0;
  const totalExpense = stats?.totalExpense ?? 0;
  const netBalance = stats?.netBalance ?? 0;
  const actualBalance = initialBalance + netBalance;

  const cards = [
    {
      label: "总收入",
      value: totalIncome,
      icon: ArrowUpCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      count: stats?.incomeCount ?? 0,
    },
    {
      label: "总支出",
      value: totalExpense,
      icon: ArrowDownCircle,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/40",
      count: stats?.expenseCount ?? 0,
    },
    {
      label: "净收支",
      value: netBalance,
      icon: Scale,
      color: netBalance >= 0 ? "text-emerald-600" : "text-red-600",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      label: "实际余额",
      value: actualBalance,
      icon: Wallet,
      color: actualBalance >= 0 ? "text-emerald-600" : "text-red-600",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      sub: initialBalance !== 0 ? `含初始 ¥${formatCurrency(initialBalance)}` : undefined,
    },
    {
      label: "交易笔数",
      value: stats?.transactionCount ?? 0,
      icon: Receipt,
      color: "text-indigo-600",
      bg: "bg-indigo-50 dark:bg-indigo-950/40",
      isCount: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                {loading ? (
                  <div className="mt-2 h-7 w-24 animate-pulse rounded bg-muted" />
                ) : (
                  <p
                    className={`mt-1 text-xl font-semibold tabular-nums ${card.color}`}
                  >
                    {card.isCount ? card.value : `¥${formatCurrency(card.value)}`}
                  </p>
                )}
                {!loading && !card.isCount && card.count !== undefined && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{card.count} 笔</p>
                )}
                {!loading && card.sub && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{card.sub}</p>
                )}
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
