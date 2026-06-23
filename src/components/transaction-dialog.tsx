"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiPost, apiPut } from "@/hooks/use-data";
import { useLedger } from "@/hooks/use-ledger";
import type { Category, Transaction, Tag, TransactionType, CategoryGroup } from "@/lib/types";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  groups?: CategoryGroup[];
  tags?: Tag[];
  editTransaction?: Transaction | null;
  onSaved?: () => void;
}

export function TransactionDialog({
  open,
  onOpenChange,
  categories: parentCategories,
  groups: parentGroups = [],
  editTransaction,
  onSaved,
}: TransactionDialogProps) {
  const { ledgers, activeLedgerId, setActiveLedgerId } = useLedger();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>("");

  // 当选择不同账本时，加载该账本的分类
  const [localCategories, setLocalCategories] = useState<Category[] | null>(null);
  const [localGroups, setLocalGroups] = useState<CategoryGroup[] | null>(null);

  const targetLedgerId = selectedLedgerId ? parseInt(selectedLedgerId, 10) : activeLedgerId;
  const isDifferentLedger = targetLedgerId !== activeLedgerId;

  // 当选择的账本与当前不同时，拉取对应分类
  useEffect(() => {
    if (!open || !isDifferentLedger || !targetLedgerId) {
      setLocalCategories(null);
      setLocalGroups(null);
      return;
    }
    const fetchCategories = async () => {
      try {
        const [catRes, groupRes] = await Promise.all([
          fetch(`/api/categories?ledger_id=${targetLedgerId}`),
          fetch(`/api/category-groups?ledger_id=${targetLedgerId}`),
        ]);
        const catJson = await catRes.json();
        const groupJson = await groupRes.json();
        if (catJson.success) setLocalCategories(catJson.data || []);
        if (groupJson.success) setLocalGroups(groupJson.data || []);
      } catch {
        // 静默处理
      }
    };
    fetchCategories();
  }, [open, isDifferentLedger, targetLedgerId]);

  // 使用本地分类或父组件传入的分类
  const categories = isDifferentLedger && localCategories ? localCategories : parentCategories;
  const groups = isDifferentLedger && localGroups ? localGroups : parentGroups;

  useEffect(() => {
    if (open) {
      if (editTransaction) {
        setSelectedLedgerId(String(editTransaction.ledger_id));
        setType(editTransaction.type);
        setAmount(editTransaction.amount);
        setCategoryId(editTransaction.category_id ? String(editTransaction.category_id) : "");
        setDescription(editTransaction.description || "");
        setDate(editTransaction.transaction_date.slice(0, 10));
      } else {
        setSelectedLedgerId(activeLedgerId ? String(activeLedgerId) : "");
        setType("expense");
        setAmount("");
        setCategoryId("");
        setDescription("");
        setDate(new Date().toISOString().slice(0, 10));
      }
    }
  }, [open, editTransaction, activeLedgerId]);

  // 切换账本时清空分类选择
  useEffect(() => {
    setCategoryId("");
  }, [selectedLedgerId]);

  const filteredCategories = categories.filter((c) => c.type === type);
  const filteredGroups = groups.filter((g) => g.type === type);
  const ungroupedCats = filteredCategories.filter((c) => !c.group_id);

  // 按分组组织分类
  const groupedOptions = filteredGroups.map((g) => ({
    group: g,
    categories: filteredCategories.filter((c) => c.group_id === g.id),
  })).filter((g) => g.categories.length > 0);

  const hasAnyGrouped = groupedOptions.length > 0 || ungroupedCats.length > 0;

  const handleSave = async () => {
    if (!targetLedgerId) return;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    setSaving(true);
    try {
      const body = {
        ledger_id: targetLedgerId,
        category_id: categoryId ? parseInt(categoryId, 10) : null,
        amount: numAmount,
        type,
        description: description.trim(),
        transaction_date: date ? new Date(date + "T12:00:00").toISOString() : undefined,
      };

      if (editTransaction) {
        await apiPut(`/api/transactions/${editTransaction.id}`, body);
      } else {
        await apiPost("/api/transactions", body);
      }

      // 如果添加记录时选择了不同的账本，自动切换过去
      if (!editTransaction && targetLedgerId !== activeLedgerId) {
        setActiveLedgerId(targetLedgerId);
      }

      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editTransaction ? "编辑记录" : "添加收支记录"}</DialogTitle>
          <DialogDescription>
            {editTransaction ? "修改交易信息" : "记录一笔新的收入或支出"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 账本选择 */}
          {ledgers.length > 1 && (
            <div className="space-y-2">
              <Label>归属账本</Label>
              <Select value={selectedLedgerId} onValueChange={setSelectedLedgerId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择账本" />
                </SelectTrigger>
                <SelectContent>
                  {ledgers.map((ledger) => (
                    <SelectItem key={ledger.id} value={String(ledger.id)}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: ledger.id === targetLedgerId
                              ? "var(--primary)"
                              : "var(--muted-foreground)",
                          }}
                        />
                        {ledger.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 收支类型切换 */}
          <Tabs value={type} onValueChange={(v) => { setType(v as TransactionType); setCategoryId(""); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600">
                支出
              </TabsTrigger>
              <TabsTrigger value="income" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600">
                收入
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 金额输入 */}
          <div className="space-y-2">
            <Label htmlFor="tx-amount">金额</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0"
                className="pl-7 text-lg font-medium tabular-nums"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
          </div>

          {/* 分类选择 */}
          <div className="space-y-2">
            <Label>分类</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="选择分类（可选）" />
              </SelectTrigger>
              <SelectContent>
                {!hasAnyGrouped && (
                  <SelectItem value="none" disabled>暂无分类</SelectItem>
                )}
                {groupedOptions.map(({ group, categories: cats }) => (
                  <div key={group.id}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {group.name}
                    </div>
                    {cats.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        <span className="flex items-center gap-2">
                          {cat.color && (
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          )}
                          {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                  </div>
                ))}
                {ungroupedCats.length > 0 && (
                  <div>
                    {groupedOptions.length > 0 && (
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">未分组</div>
                    )}
                    {ungroupedCats.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        <span className="flex items-center gap-2">
                          {cat.color && (
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          )}
                          {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 日期 */}
          <div className="space-y-2">
            <Label htmlFor="tx-date">日期</Label>
            <Input
              id="tx-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* 备注 */}
          <div className="space-y-2">
            <Label htmlFor="tx-desc">备注</Label>
            <Textarea
              id="tx-desc"
              placeholder="可选：记录这笔交易的说明"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !amount || parseFloat(amount) <= 0}
            className={type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
          >
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
