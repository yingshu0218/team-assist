"use client";

import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Tag as TagIcon } from "lucide-react";
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
import { useLedger } from "@/hooks/use-ledger";
import { useFetch, apiPost, apiPut, apiDelete } from "@/hooks/use-data";
import { DEFAULT_TAG_COLORS } from "@/lib/constants";
import type { Tag } from "@/lib/types";

export function TagsView() {
  const { activeLedger, activeLedgerId } = useLedger();
  const [refreshTick, setRefreshTick] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editTag, setEditTag] = useState<Tag | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(DEFAULT_TAG_COLORS[0]);

  const triggerRefresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  const url = activeLedgerId ? `/api/tags?ledger_id=${activeLedgerId}&_t=${refreshTick}` : null;
  const { data: tags, loading } = useFetch<Tag[]>(url);

  const handleSave = async () => {
    if (!activeLedgerId || !tagName.trim()) return;

    if (editTag) {
      await apiPut(`/api/tags/${editTag.id}`, {
        name: tagName.trim(),
        color: tagColor,
      });
    } else {
      await apiPost("/api/tags", {
        ledger_id: activeLedgerId,
        name: tagName.trim(),
        color: tagColor,
      });
    }

    triggerRefresh();
    setShowAdd(false);
    setTagName("");
    setTagColor(DEFAULT_TAG_COLORS[0]);
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    await apiDelete(`/api/tags/${deleteId}`);
    triggerRefresh();
    setDeleteId(null);
  };

  const openAdd = () => {
    setEditTag(null);
    setTagName("");
    setTagColor(DEFAULT_TAG_COLORS[0]);
    setShowAdd(true);
  };

  const openEdit = (tag: Tag) => {
    setEditTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color || DEFAULT_TAG_COLORS[0]);
    setShowAdd(true);
  };

  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">标签管理</h2>
          <p className="text-sm text-muted-foreground">
            {activeLedger ? `${activeLedger.name} · ` : ""}管理自定义标签，为交易记录添加多维度标记
          </p>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-1 h-4 w-4" />
          添加标签
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">全部标签（{tags?.length || 0}）</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-muted" />
              ))}
            </div>
          ) : !tags || tags.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <TagIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                暂无标签，点击「添加标签」创建
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="group flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5"
                  style={{
                    backgroundColor: (tag.color || "#6B7280") + "15",
                    color: tag.color || "#6B7280",
                  }}
                >
                  <span className="text-sm font-medium">{tag.name}</span>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => openEdit(tag)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => setDeleteId(tag.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加/编辑标签对话框 */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTag ? "编辑标签" : "添加标签"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tag-name">标签名称</Label>
              <Input
                id="tag-name"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="如：报销、AA制"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
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
                      outline: tagColor === color ? "2px solid #18181B" : "none",
                      outlineOffset: "2px",
                    }}
                    onClick={() => setTagColor(color)}
                  />
                ))}
              </div>
            </div>
            {/* 预览 */}
            <div className="space-y-2">
              <Label>预览</Label>
              <div
                className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                style={{
                  backgroundColor: tagColor + "15",
                  color: tagColor,
                }}
              >
                {tagName || "标签名称"}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
            <Button onClick={handleSave} disabled={!tagName.trim()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除标签</AlertDialogTitle>
            <AlertDialogDescription>确定删除此标签吗？此操作不可撤销。</AlertDialogDescription>
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
