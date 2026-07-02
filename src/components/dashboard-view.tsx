"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Plus,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Users,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OverviewCharts } from "@/components/overview-charts";
import { TransactionDialog } from "@/components/transaction-dialog";
import { useLedger } from "@/hooks/use-ledger";
import { useFetch } from "@/hooks/use-data";
import { authHeaders } from "@/hooks/use-data";
import { formatCurrency, formatDate } from "@/lib/constants";
import { getLedgerBalance } from "@/lib/ledger-presentation";
import { resolveLedgerSelection } from "@/lib/ledger-selection";
import type {
  StatsResponse,
  Transaction,
  Category,
  CategoryGroup,
  Ledger,
} from "@/lib/types";

interface DashboardViewProps {
  onNavigate: (tab: "dashboard" | "transactions" | "categories" | "tags" | "crm-contacts" | "crm-events") => void;
}

interface LedgerOverview {
  ledger: Ledger;
  totalIncome: number;
  totalExpense: number;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { ledgers, activeLedger, activeLedgerId, setActiveLedgerId } = useLedger();
  const [showAddTx, setShowAddTx] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [ledgerOverviews, setLedgerOverviews] = useState<LedgerOverview[]>([]);
  const [overviewsLoading, setOverviewsLoading] = useState(true);
  const [totalContacts, setTotalContacts] = useState(0);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [trendLedgerId, setTrendLedgerId] = useState<number | null>(null);
  const [expenseLedgerId, setExpenseLedgerId] = useState<number | null>(null);

  const triggerRefresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (ledgers.length === 0) {
      setOverviewsLoading(false);
      return;
    }
    setOverviewsLoading(true);
    Promise.all(
      ledgers.map(async (ledger) => {
        try {
          const res = await fetch(`/api/stats?ledger_id=${ledger.id}&_t=${refreshTick}`, {
            headers: { ...authHeaders() },
          });
          const json = await res.json();
          const stats: StatsResponse = json.data || {
            totalIncome: 0, totalExpense: 0, netBalance: 0,
            incomeCount: 0, expenseCount: 0, transactionCount: 0,
            categoryBreakdown: [], monthlyTrend: [],
          };
          return {
            ledger,
            totalIncome: stats.totalIncome ?? 0,
            totalExpense: stats.totalExpense ?? 0,
          };
        } catch {
          return { ledger, totalIncome: 0, totalExpense: 0 };
        }
      })
    ).then((results) => {
      setLedgerOverviews(results);
      setOverviewsLoading(false);
    });
  }, [ledgers, refreshTick]);

  useEffect(() => {
    const ledgerIds = ledgers.map((l) => l.id);
    setTrendLedgerId((sel) => resolveLedgerSelection(ledgerIds, sel, activeLedgerId));
    setExpenseLedgerId((sel) => resolveLedgerSelection(ledgerIds, sel, activeLedgerId));
  }, [ledgers, activeLedgerId]);

  useEffect(() => {
    setContactsLoading(true);
    fetch(`/api/crm/contacts?_t=${refreshTick}`, { headers: { ...authHeaders() } })
      .then((res) => res.json())
      .then((json) => setTotalContacts(json.data?.length ?? 0))
      .catch(() => setTotalContacts(0))
      .finally(() => setContactsLoading(false));
  }, [refreshTick]);

  const trendStatsUrl = trendLedgerId ? `/api/stats?ledger_id=${trendLedgerId}&_t=${refreshTick}` : null;
  const expenseStatsUrl = expenseLedgerId ? `/api/stats?ledger_id=${expenseLedgerId}&_t=${refreshTick}` : null;
  const { data: trendStats, loading: trendLoading } = useFetch<StatsResponse>(trendStatsUrl);
  const { data: expenseStats, loading: expenseLoading } = useFetch<StatsResponse>(expenseStatsUrl);

  const catUrl = activeLedgerId ? `/api/categories?ledger_id=${activeLedgerId}` : null;
  const groupUrl = activeLedgerId ? `/api/category-groups?ledger_id=${activeLedgerId}` : null;
  const { data: categories } = useFetch<Category[]>(catUrl);
  const { data: categoryGroups } = useFetch<CategoryGroup[]>(groupUrl);

  const txUrl = activeLedgerId ? `/api/transactions?ledger_id=${activeLedgerId}&limit=8&_t=${refreshTick}` : null;
  const { data: recentTx, loading: txLoading } = useFetch<Transaction[]>(txUrl);

  // 当前账本的统计数据
  const activeOverview = ledgerOverviews.find((o) => o.ledger.id === activeLedgerId);
  const activeIncome = activeOverview?.totalIncome ?? 0;
  const activeExpense = activeOverview?.totalExpense ?? 0;
  const activeBalance = activeLedger
    ? getLedgerBalance(activeLedger.initial_balance, activeIncome, activeExpense)
    : 0;
  const activeTxCount = trendStats?.transactionCount ?? 0;

  if (ledgers.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="text-center animate-fade-in-up">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold font-display">尚未创建账本</h2>
          <p className="mt-1 text-sm text-muted-foreground">请在左侧创建一个账本开始使用</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ── 页面头部 ── */}
      <div className="flex items-start justify-between gap-4 animate-fade-in-up">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold font-display tracking-tight">概览</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {ledgers.length} 个账本 · {totalContacts} 位联系人
          </p>
        </div>
        <Button
          onClick={() => setShowAddTx(true)}
          className="shrink-0 shadow-soft"
        >
          <Plus className="mr-1 h-4 w-4" />
          添加记录
        </Button>
      </div>

      {/* ── Hero 余额区 ── */}
      {activeLedger && (
        <Card className="relative overflow-hidden border-0 mesh-bg-emerald shadow-float animate-fade-in-up stagger-1">
          <CardContent className="relative z-10 p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {activeLedger.name}
                  </span>
                  {activeLedger.description && (
                    <span className="text-xs text-muted-foreground/70">
                      · {activeLedger.description}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    当前余额
                  </p>
                  <p className={`mt-1 font-display text-4xl font-extrabold tnum sm:text-5xl ${
                    activeBalance >= 0 ? "text-foreground" : "text-destructive"
                  }`}>
                    ¥{formatCurrency(activeBalance)}
                  </p>
                </div>
              </div>

              {/* 收支摘要 */}
              <div className="flex gap-6 sm:gap-8">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-medium text-muted-foreground">收入</span>
                  </div>
                  <p className="font-display text-xl font-bold tnum text-emerald-600 dark:text-emerald-400">
                    ¥{formatCurrency(activeIncome)}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-xs font-medium text-muted-foreground">支出</span>
                  </div>
                  <p className="font-display text-xl font-bold tnum text-red-600 dark:text-red-400">
                    ¥{formatCurrency(activeExpense)}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">交易</span>
                  </div>
                  <p className="font-display text-xl font-bold tnum text-foreground">
                    {activeTxCount}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Bento 统计网格 ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* 联系人卡片 */}
        <Card
          className="hover-lift cursor-pointer border-border/50 shadow-soft animate-fade-in-up stagger-2"
          onClick={() => onNavigate("crm-contacts")}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40">
                <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <div className="mt-4">
              {contactsLoading ? (
                <div className="h-8 w-16 shimmer rounded" />
              ) : (
                <p className="font-display text-2xl font-bold tnum text-foreground">
                  {totalContacts}
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">联系人</p>
            </div>
          </CardContent>
        </Card>

        {/* 其他账本概览 */}
        {overviewsLoading ? (
          ledgers.slice(0, 3).map((ledger, i) => (
            <Card key={ledger.id} className={`border-border/50 shadow-soft animate-fade-in-up stagger-${i + 3}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2.5 w-2.5 rounded-full shimmer" />
                  <div className="h-4 w-20 shimmer rounded" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="space-y-1">
                      <div className="h-3 w-10 shimmer rounded" />
                      <div className="h-5 w-14 shimmer rounded" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          ledgerOverviews
            .filter((o) => o.ledger.id !== activeLedgerId)
            .slice(0, 3)
            .map(({ ledger, totalIncome, totalExpense }, i) => {
              const balance = getLedgerBalance(ledger.initial_balance, totalIncome, totalExpense);
              return (
                <Card
                  key={ledger.id}
                  className={`hover-lift cursor-pointer border-border/50 shadow-soft animate-fade-in-up stagger-${i + 3}`}
                  onClick={() => setActiveLedgerId(ledger.id)}
                >
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {ledger.name}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                          余额
                        </p>
                        <p className="font-display text-lg font-bold tnum text-foreground">
                          ¥{formatCurrency(balance)}
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground">收入</p>
                          <p className="text-sm font-semibold tnum text-emerald-600 dark:text-emerald-400">
                            ¥{formatCurrency(totalIncome)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">支出</p>
                          <p className="text-sm font-semibold tnum text-red-600 dark:text-red-400">
                            ¥{formatCurrency(totalExpense)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
        )}
      </div>

      {/* ── 图表区 ── */}
      {activeLedger && (
        <div className="animate-fade-in-up stagger-4">
          <OverviewCharts
            ledgers={ledgers}
            trendLedgerId={trendLedgerId}
            expenseLedgerId={expenseLedgerId}
            trendStats={trendStats}
            expenseStats={expenseStats}
            trendLoading={trendLoading}
            expenseLoading={expenseLoading}
            onTrendLedgerChange={setTrendLedgerId}
            onExpenseLedgerChange={setExpenseLedgerId}
          />
        </div>
      )}

      {/* ── 最近交易 ── */}
      {activeLedger && (
        <Card className="border-border/50 shadow-soft animate-fade-in-up stagger-5">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">最近交易</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{activeLedger.name}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onNavigate("transactions")}
              >
                查看全部
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>

            {txLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 shimmer rounded-xl" />
                ))}
              </div>
            ) : !recentTx || recentTx.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                暂无交易记录，点击「添加记录」开始记账
              </div>
            ) : (
              <div className="space-y-1">
                {recentTx.map((tx, i) => (
                  <div
                    key={tx.id}
                    className="group flex items-center justify-between rounded-xl px-3 py-2.5 transition-all hover:bg-muted/40 animate-fade-in"
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-transform group-hover:scale-110"
                        style={{
                          backgroundColor: tx.type === "income"
                            ? "oklch(0.95 0.05 145)"
                            : "oklch(0.95 0.05 25)",
                          color: tx.type === "income"
                            ? "oklch(0.5 0.15 145)"
                            : "oklch(0.55 0.2 25)",
                        }}
                      >
                        {tx.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {tx.category?.name || "未分类"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.description || formatDate(tx.transaction_date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-display text-sm font-bold tnum ${
                          tx.type === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "−"}¥{formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground/70">{formatDate(tx.transaction_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <TransactionDialog
        open={showAddTx}
        onOpenChange={setShowAddTx}
        categories={categories || []}
        groups={categoryGroups || []}
        onSaved={triggerRefresh}
      />
    </main>
  );
}
