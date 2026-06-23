"use client";

import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLedger } from "@/hooks/use-ledger";
import { useFetch, apiPost, apiPut, apiDelete } from "@/hooks/use-data";
import type { Category, CategoryGroup, TransactionType } from "@/lib/types";
import { DEFAULT_TAG_COLORS } from "@/lib/constants";

interface GroupWithCategories extends CategoryGroup {
  categories: Category[];
}

export function CategoriesView() {
  const { activeLedger, activeLedgerId } = useLedger();
  const [refreshTick, setRefreshTick] = useState(0);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());

  // 分类弹窗
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<TransactionType>("expense");
  const [catGroupId, setCatGroupId] = useState<string>("");
  const [catColor, setCatColor] = useState(DEFAULT_TAG_COLORS[0]);

  // 分组弹窗
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editGroup, setEditGroup] = useState<CategoryGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState<TransactionType>("expense");

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "group"; id: number } | null>(null);

  const triggerRefresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  const groupsUrl = activeLedgerId ? `/api/category-groups?ledger_id=${activeLedgerId}&_t=${refreshTick}` : null;
  const catsUrl = activeLedgerId ? `/api/categories?ledger_id=${activeLedgerId}&_t=${refreshTick}` : null;

  const { data: groups } = useFetch<CategoryGroup[]>(groupsUrl);
  const { data: categories, loading } = useFetch<Category[]>(catsUrl);

  // 按分组组织分类
  const buildGrouped = (type: TransactionType): GroupWithCategories[] => {
    const filteredGroups = (groups || []).filter((g) => g.type === type);
    const filteredCats = (categories || []).filter((c) => c.type === type);

    const result: GroupWithCategories[] = filteredGroups.map((g) => ({
      ...g,
      categories: filteredCats.filter((c) => c.group_id === g.id),
    }));

    // 未分组的分类
    const ungrouped = filteredCats.filter((c) => !c.group_id);
    if (ungrouped.length > 0) {
      result.push({
        id: -1,
        ledger_id: activeLedgerId || 0,
        name: "未分组",
        type,
        icon: null,
        sort_order: 999,
        created_at: "",
        categories: ungrouped,
      });
    }

    return result;
  };

  const expenseGrouped = buildGrouped("expense");
  const incomeGrouped = buildGrouped("income");

  const toggleCollapse = (groupId: number) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // ---- 分类 CRUD ----
  const openAddCat = (type: TransactionType, groupId?: number) => {
    setEditCat(null);
    setCatName("");
    setCatType(type);
    setCatGroupId(groupId ? String(groupId) : "");
    setCatColor(DEFAULT_TAG_COLORS[0]);
    setShowCatDialog(true);
  };

  const openEditCat = (cat: Category) => {
    setEditCat(cat);
    setCatName(cat.name);
    setCatType(cat.type);
    setCatGroupId(cat.group_id ? String(cat.group_id) : "");
    setCatColor(cat.color || DEFAULT_TAG_COLORS[0]);
    setShowCatDialog(true);
  };

  const handleSaveCat = async () => {
    if (!activeLedgerId || !catName.trim()) return;

    if (editCat) {
      await apiPut(`/api/categories/${editCat.id}`, {
        name: catName.trim(),
        color: catColor,
        group_id: catGroupId ? parseInt(catGroupId, 10) : null,
      });
    } else {
      await apiPost("/api/categories", {
        ledger_id: activeLedgerId,
        group_id: catGroupId ? parseInt(catGroupId, 10) : null,
        name: catName.trim(),
        type: catType,
        color: catColor,
      });
    }

    triggerRefresh();
    setShowCatDialog(false);
  };

  // ---- 分组 CRUD ----
  const openAddGroup = (type: TransactionType) => {
    setEditGroup(null);
    setGroupName("");
    setGroupType(type);
    setShowGroupDialog(true);
  };

  const openEditGroup = (group: CategoryGroup) => {
    setEditGroup(group);
    setGroupName(group.name);
    setGroupType(group.type);
    setShowGroupDialog(true);
  };

  const handleSaveGroup = async () => {
    if (!activeLedgerId || !groupName.trim()) return;

    if (editGroup) {
      await apiPut(`/api/category-groups/${editGroup.id}`, {
        name: groupName.trim(),
      });
    } else {
      await apiPost("/api/category-groups", {
        ledger_id: activeLedgerId,
        name: groupName.trim(),
        type: groupType,
      });
    }

    triggerRefresh();
    setShowGroupDialog(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "category") {
      await apiDelete(`/api/categories/${deleteTarget.id}`);
    } else {
      await apiDelete(`/api/category-groups/${deleteTarget.id}`);
    }
    triggerRefresh();
    setDeleteTarget(null);
  };

  const typeGroups = (type: TransactionType) => type === "expense" ? expenseGrouped : incomeGrouped;
  const typeLabel = (type: TransactionType) => type === "expense" ? "支出" : "收入";

  const renderGroupSection = (type: TransactionType) => {
    const grouped = typeGroups(type);
    const label = typeLabel(type);
    const totalCats = grouped.reduce((sum, g) => sum + g.categories.length, 0);

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">
            {label}分类（{totalCats}）
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openAddGroup(type)}>
              <Plus className="mr-1 h-3 w-3" />
              添加分组
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openAddCat(type)}>
              <Plus className="mr-1 h-3 w-3" />
              添加分类
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
              暂无{label}分类
            </div>
          ) : (
            <div className="space-y-1">
              {grouped.map((group) => {
                const isCollapsed = collapsedGroups.has(group.id);
                const isUngrouped = group.id === -1;

                return (
                  <div key={group.id} className="rounded-lg border border-border/50">
                    {/* 分组头 */}
                    <div
                      className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => !isUngrouped && toggleCollapse(group.id)}
                    >
                      <div className="flex items-center gap-2">
                        {!isUngrouped && (
                          isCollapsed
                            ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span className={`text-sm font-medium ${isUngrouped ? "text-muted-foreground" : "text-foreground"}`}>
                          {group.name}
                        </span>
                        <span className="text-xs text-muted-foreground">({group.categories.length})</span>
                      </div>
                      {!isUngrouped && (
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100" style={{ opacity: undefined }}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); openAddCat(type, group.id); }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); openEditGroup(group); }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-600"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "group", id: group.id }); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* 分组内分类 */}
                    {!isCollapsed && group.categories.length > 0 && (
                      <div className="border-t border-border/30">
                        {group.categories.map((cat) => (
                          <div
                            key={cat.id}
                            className="flex items-center justify-between px-3 py-2 pl-10 transition-colors hover:bg-muted/30 group"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: (cat.color || "#6B7280") + "20",
                                  color: cat.color || "#6B7280",
                                }}
                              >
                                {cat.name.slice(0, 1)}
                              </span>
                              <span className="text-sm text-foreground">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditCat(cat)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-500 hover:text-red-600"
                                onClick={() => setDeleteTarget({ type: "category", id: cat.id })}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 折叠时显示简略 */}
                    {isCollapsed && group.categories.length > 0 && (
                      <div className="border-t border-border/30 px-3 py-1.5 pl-10">
                        <span className="text-xs text-muted-foreground">
                          {group.categories.map((c) => c.name).join("、")}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // 当前类型下的分组列表（用于分类弹窗选择）
  const currentTypeGroups = (type: TransactionType) =>
    (groups || []).filter((g) => g.type === type);

  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">分类管理</h2>
        <p className="text-sm text-muted-foreground">
          {activeLedger ? `${activeLedger.name} · ` : ""}按分组管理收支分类，快速归类交易记录
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {renderGroupSection("expense")}
        {renderGroupSection("income")}
      </div>

      {/* 添加/编辑分类对话框 */}
      <Dialog open={showCatDialog} onOpenChange={setShowCatDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editCat ? "编辑分类" : "添加分类"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cat-name">分类名称</Label>
              <Input
                id="cat-name"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="如：餐饮、交通"
                onKeyDown={(e) => e.key === "Enter" && handleSaveCat()}
              />
            </div>
            {!editCat && (
              <div className="space-y-2">
                <Label>分类类型</Label>
                <Select value={catType} onValueChange={(v) => { setCatType(v as TransactionType); setCatGroupId(""); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">支出</SelectItem>
                    <SelectItem value="income">收入</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>所属分组</Label>
              <Select value={catGroupId} onValueChange={setCatGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择分组（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未分组</SelectItem>
                  {currentTypeGroups(catType).map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>颜色</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-8 w-8 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      outline: catColor === color ? "2px solid #18181B" : "none",
                      outlineOffset: "2px",
                    }}
                    onClick={() => setCatColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCatDialog(false)}>取消</Button>
            <Button onClick={handleSaveCat} disabled={!catName.trim()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加/编辑分组对话框 */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editGroup ? "编辑分组" : "添加分组"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="group-name">分组名称</Label>
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="如：日常办公、餐饮食品"
                onKeyDown={(e) => e.key === "Enter" && handleSaveGroup()}
              />
            </div>
            {!editGroup && (
              <div className="space-y-2">
                <Label>分组类型</Label>
                <Select value={groupType} onValueChange={(v) => setGroupType(v as TransactionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">支出</SelectItem>
                    <SelectItem value="income">收入</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupDialog(false)}>取消</Button>
            <Button onClick={handleSaveGroup} disabled={!groupName.trim()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "group" ? "删除分组" : "删除分类"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "group"
                ? "删除分组后，其下分类将变为「未分组」。确定删除吗？"
                : "删除后，已使用此分类的交易记录将变为「未分类」。确定删除吗？"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
