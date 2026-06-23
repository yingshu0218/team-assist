"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Plus,
  ArrowRight,
  Receipt,
  BookOpen,
  Users,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OverviewCharts } from "@/components/overview-charts";
import { TransactionDialog } from "@/components/transaction-dialog";
import { useLedger } from "@/hooks/use-ledger";
import { useFetch } from "@/hooks/use-data";
import { authHeaders } from "@/hooks/use-data";
import { formatCurrency, formatDate } from "@/lib/constants";
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

/** 单个账本的概览数据 */
interface LedgerOverview {
  ledger: Ledger;
  totalIncome: number;
  totalExpense: number;
  incomeCount: number;
  expenseCount: number;
  transactionCount: number;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { ledgers, activeLedger, activeLedgerId, setActiveLedgerId } = useLedger();
  const [showAddTx, setShowAddTx] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [ledgerOverviews, setLedgerOverviews] = useState<LedgerOverview[]>([]);
  const [overviewsLoading, setOverviewsLoading] = useState(true);
  const [totalContacts, setTotalContacts] = useState(0);
  const [contactsLoading, setContactsLoading] = useState(true);

  const triggerRefresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  // 获取所有账本的概览数据
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
            incomeCount: stats.incomeCount ?? 0,
            expenseCount: stats.expenseCount ?? 0,
            transactionCount: stats.transactionCount ?? 0,
          };
        } catch {
          return {
            ledger,
            totalIncome: 0, totalExpense: 0,
            incomeCount: 0, expenseCount: 0, transactionCount: 0,
          };
        }
      })
    ).then((results) => {
      setLedgerOverviews(results);
      setOverviewsLoading(false);
    });
  }, [ledgers, refreshTick]);

  // 获取联系人总数
  useEffect(() => {
    setContactsLoading(true);
    fetch(`/api/crm/contacts?_t=${refreshTick}`, {
      headers: { ...authHeaders() },
    })
      .then((res) => res.json())
      .then((json) => {
        setTotalContacts(json.data?.length ?? 0);
      })
      .catch(() => setTotalContacts(0))
      .finally(() => setContactsLoading(false));
  }, [refreshTick]);

  // 当前账本的详细统计
  const statsUrl = activeLedgerId ? `/api/stats?ledger_id=${activeLedgerId}&_t=${refreshTick}` : null;
  const { data: activeStats, loading: statsLoading } = useFetch<StatsResponse>(statsUrl);

  // 当前账本的分类
  const catUrl = activeLedgerId ? `/api/categories?ledger_id=${activeLedgerId}` : null;
  const groupUrl = activeLedgerId ? `/api/category-groups?ledger_id=${activeLedgerId}` : null;
  const { data: categories } = useFetch<Category[]>(catUrl);
  const { data: categoryGroups } = useFetch<CategoryGroup[]>(groupUrl);

  // 当前账本的最近交易
  const txUrl = activeLedgerId ? `/api/transactions?ledger_id=${activeLedgerId}&limit=8&_t=${refreshTick}` : null;
  const { data: recentTx, loading: txLoading } = useFetch<Transaction[]>(txUrl);

  // 无账本
  if (ledgers.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">尚未创建账本</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            请在左侧创建一个账本开始使用
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6">
      {/* 页面头部 */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight">概览</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            共 {ledgers.length} 个账本 · {totalContacts} 位联系人
          </p>
        </div>
        <Button onClick={() => setShowAddTx(true)} className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-1 h-4 w-4" />
          添加记录
        </Button>
      </div>

      {/* 联系人数量卡片 */}
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md"
        onClick={() => onNavigate("crm-contacts")}
      >
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
            <Users className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">联系人</p>
            {contactsLoading ? (
              <div className="mt-1 h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
                {totalContacts}
              </p>
            )}
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>

      {/* 每个账本的概览卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {overviewsLoading ? (
          ledgers.map((ledger) => (
            <Card key={ledger.id}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-muted" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                      <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          ledgerOverviews.map(({ ledger, totalIncome, totalExpense, incomeCount, expenseCount, transactionCount }) => {
            const isActive = ledger.id === activeLedgerId;

            return (
              <Card
                key={ledger.id}
                className={`transition-all hover:shadow-md ${
                  isActive
                    ? "ring-2 ring-primary/50 shadow-md"
                    : "cursor-pointer"
                }`}
                onClick={() => {
                  if (!isActive) setActiveLedgerId(ledger.id);
                }}
              >
                <CardContent className="p-5">
                  {/* 账本名称行 */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${isActive ? "bg-primary" : "bg-muted-foreground/40"}`} />
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {ledger.name}
                      </h3>
                    </div>
                    {isActive && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        当前
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* 总收入 */}
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <TrendingUp className="h-3 w-3 text-emerald-600" />
                        <span className="text-[10px] font-medium text-muted-foreground">收入</span>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-emerald-600 truncate">
                        ¥{formatCurrency(totalIncome)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{incomeCount} 笔</p>
                    </div>
                    {/* 总支出 */}
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <TrendingDown className="h-3 w-3 text-red-600" />
                        <span className="text-[10px] font-medium text-muted-foreground">支出</span>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-red-600 truncate">
                        ¥{formatCurrency(totalExpense)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{expenseCount} 笔</p>
                    </div>
                    {/* 记账笔数 */}
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <Receipt className="h-3 w-3 text-indigo-600" />
                        <span className="text-[10px] font-medium text-muted-foreground">笔数</span>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-indigo-600">
                        {transactionCount}
                      </p>
                      <p className="text-[10px] text-muted-foreground">全部记录</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 当前账本详情：图表 + 最近交易 */}
      {activeLedger && (
        <>
          <OverviewCharts stats={activeStats} loading={statsLoading} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">最近交易 — {activeLedger.name}</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigate("transactions")}>
                查看全部
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {txLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : !recentTx || recentTx.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  暂无交易记录，点击「添加记录」开始记账
                </div>
              ) : (
                <div className="space-y-1">
                  {recentTx.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: tx.type === "income" ? "#dcfce7" : "#fee2e2",
                            color: tx.type === "income" ? "#16A34A" : "#DC2626",
                          }}
                        >
                          {tx.type === "income" ? "入" : "出"}
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
                          className={`text-sm font-semibold tabular-nums ${
                            tx.type === "income" ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "-"}¥{formatCurrency(tx.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.transaction_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
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
