"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, Filter, Download, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TransactionDialog } from "@/components/transaction-dialog";
import { ExportDialog } from "@/components/export-dialog";
import { useLedger } from "@/hooks/use-ledger";
import { useFetch, apiDelete } from "@/hooks/use-data";
import { formatCurrency, formatDate, getDateKey } from "@/lib/constants";
import type { Transaction, Category, CategoryGroup, TransactionType } from "@/lib/types";

export function TransactionsView() {
  const { ledgers, activeLedger, activeLedgerId, setActiveLedgerId } = useLedger();
  const [showAddTx, setShowAddTx] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [showExport, setShowExport] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  const catUrl = activeLedgerId ? `/api/categories?ledger_id=${activeLedgerId}` : null;
  const groupUrl = activeLedgerId ? `/api/category-groups?ledger_id=${activeLedgerId}` : null;
  const { data: categories } = useFetch<Category[]>(catUrl);
  const { data: categoryGroups } = useFetch<CategoryGroup[]>(groupUrl);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (activeLedgerId) params.set("ledger_id", String(activeLedgerId));
    if (filterType !== "all") params.set("type", filterType);
    if (filterCategory !== "all") params.set("category_id", filterCategory);
    if (search.trim()) params.set("search", search.trim());
    params.set("limit", "200");
    params.set("_t", String(refreshTick));
    return params.toString();
  }, [activeLedgerId, filterType, filterCategory, search, refreshTick]);

  const txUrl = activeLedgerId ? `/api/transactions?${queryParams}` : null;
  const { data: transactions, loading } = useFetch<Transaction[]>(txUrl);

  // 按日期分组
  const groupedTransactions = useMemo(() => {
    if (!transactions) return [];
    const groups: { dateKey: string; items: Transaction[] }[] = [];
    let currentDate = "";

    for (const tx of transactions) {
      const dateKey = getDateKey(tx.transaction_date);
      if (dateKey !== currentDate) {
        groups.push({ dateKey, items: [] });
        currentDate = dateKey;
      }
      groups[groups.length - 1].items.push(tx);
    }
    return groups;
  }, [transactions]);

  // 计算每组小计
  const groupTotals = useMemo(() => {
    const totals: Record<string, { income: number; expense: number }> = {};
    for (const group of groupedTransactions) {
      const income = group.items
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const expense = group.items
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      totals[group.dateKey] = { income, expense };
    }
    return totals;
  }, [groupedTransactions]);

  const handleDelete = async () => {
    if (deleteId === null) return;
    const res = await apiDelete(`/api/transactions/${deleteId}`);
    if (res.success) {
      triggerRefresh();
    }
    setDeleteId(null);
  };

  const filteredCategories = filterType !== "all"
    ? categories?.filter((c) => c.type === filterType) || []
    : categories || [];

  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">收支明细</h2>
            <p className="text-sm text-muted-foreground">
              {transactions?.length || 0} 条记录
            </p>
          </div>
          {/* 账本切换 */}
          {ledgers.length > 1 && (
            <Select
              value={activeLedgerId ? String(activeLedgerId) : ""}
              onValueChange={(v) => setActiveLedgerId(parseInt(v, 10))}
            >
              <SelectTrigger className="w-36 h-8">
                <BookOpen className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="选择账本" />
              </SelectTrigger>
              <SelectContent>
                {ledgers.map((ledger) => (
                  <SelectItem key={ledger.id} value={String(ledger.id)}>
                    {ledger.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {ledgers.length <= 1 && activeLedger && (
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              {activeLedger.name}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowExport(true)}>
            <Download className="mr-1 h-4 w-4" />
            导出
          </Button>
          <Button onClick={() => { setEditTx(null); setShowAddTx(true); }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="mr-1 h-4 w-4" />
            添加记录
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            筛选
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="expense">支出</SelectItem>
              <SelectItem value="income">收入</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue placeholder="分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {filteredCategories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索备注..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8"
            />
          </div>
          {(filterType !== "all" || filterCategory !== "all" || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => { setFilterType("all"); setFilterCategory("all"); setSearch(""); }}
            >
              清除筛选
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 交易列表 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : !transactions || transactions.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">暂无交易记录</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => { setEditTx(null); setShowAddTx(true); }}
              >
                <Plus className="mr-1 h-4 w-4" />
                添加第一条记录
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedTransactions.map((group) => {
            const totals = groupTotals[group.dateKey];
            return (
              <div key={group.dateKey}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-medium text-muted-foreground">{group.dateKey}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {totals.income > 0 && <span className="text-emerald-600">+¥{formatCurrency(totals.income)}</span>}
                    {totals.income > 0 && totals.expense > 0 && <span className="mx-1">·</span>}
                    {totals.expense > 0 && <span className="text-red-600">-¥{formatCurrency(totals.expense)}</span>}
                  </span>
                </div>
                <Card>
                  <CardContent className="p-0">
                    {group.items.map((tx, idx) => (
                      <div
                        key={tx.id}
                        className={`flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30 group ${
                          idx < group.items.length - 1 ? "border-b border-border/50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: tx.type === "income" ? "#dcfce7" : "#fee2e2",
                              color: tx.type === "income" ? "#16A34A" : "#DC2626",
                            }}
                          >
                            {tx.type === "income" ? "入" : "出"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground truncate">
                                {tx.category?.name || "未分类"}
                              </span>
                              {tx.tags && tx.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {tx.tags.map((tag: { id: number; name: string; color: string | null }) => (
                                    <span
                                      key={tag.id}
                                      className="rounded px-1.5 py-0.5 text-[10px]"
                                      style={{
                                        backgroundColor: (tag.color || "#6B7280") + "15",
                                        color: tag.color || "#6B7280",
                                      }}
                                    >
                                      {tag.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {tx.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {tx.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p
                              className={`text-sm font-semibold tabular-nums ${
                                tx.type === "income" ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {tx.type === "income" ? "+" : "-"}¥{formatCurrency(tx.amount)}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => { setEditTx(tx); setShowAddTx(true); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600"
                              onClick={() => setDeleteId(tx.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* 添加/编辑交易对话框 */}
      <TransactionDialog
        open={showAddTx}
        onOpenChange={(open) => {
          setShowAddTx(open);
          if (!open) setEditTx(null);
        }}
        categories={categories || []}
        groups={categoryGroups || []}
        editTransaction={editTx}
        onSaved={triggerRefresh}
      />

      {/* 删除确认 */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除记录</AlertDialogTitle>
            <AlertDialogDescription>确定删除这条交易记录吗？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 导出对话框 */}
      <ExportDialog open={showExport} onOpenChange={setShowExport} type="ledger" />
    </main>
  );
}
