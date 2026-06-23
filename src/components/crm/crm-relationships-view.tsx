"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLedger } from "@/hooks/use-ledger";
import { useFetch, apiPost, apiDelete } from "@/hooks/use-data";
import type { CrmRelationship, CrmContact, CrmEvent } from "@/lib/types";

export function CrmRelationshipsView() {
  const { activeLedgerId } = useLedger();
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // 创建表单
  const [formSourceType, setFormSourceType] = useState<"contact" | "event">("contact");
  const [formSourceId, setFormSourceId] = useState("");
  const [formTargetType, setFormTargetType] = useState<"contact" | "event">("contact");
  const [formTargetId, setFormTargetId] = useState("");
  const [formLabel, setFormLabel] = useState("");

  const relUrl = activeLedgerId ? `/api/crm/relationships?ledger_id=${activeLedgerId}` : null;
  const { data: relationships, loading, refetch } = useFetch<CrmRelationship[]>(relUrl);

  const contactsUrl = activeLedgerId ? `/api/crm/contacts?ledger_id=${activeLedgerId}` : null;
  const { data: contacts } = useFetch<CrmContact[]>(contactsUrl);

  const eventsUrl = activeLedgerId ? `/api/crm/events?ledger_id=${activeLedgerId}` : null;
  const { data: events } = useFetch<CrmEvent[]>(eventsUrl);

  const getContactName = (id: number) => contacts?.find((c) => c.id === id)?.name || `联系人#${id}`;
  const getEventTitle = (id: number) => events?.find((e) => e.id === id)?.title || `事件#${id}`;
  const getEntityLabel = (type: string, id: number) =>
    type === "contact" ? getContactName(id) : getEventTitle(id);

  const resetForm = useCallback(() => {
    setFormSourceType("contact");
    setFormSourceId("");
    setFormTargetType("contact");
    setFormTargetId("");
    setFormLabel("");
  }, []);

  const handleCreate = async () => {
    if (!activeLedgerId || !formSourceId || !formTargetId) return;
    const res = await apiPost<CrmRelationship>("/api/crm/relationships", {
      ledger_id: activeLedgerId,
      source_type: formSourceType,
      source_id: parseInt(formSourceId, 10),
      target_type: formTargetType,
      target_id: parseInt(formTargetId, 10),
      label: formLabel.trim() || undefined,
    });
    if (res.success) {
      await refetch();
      setShowCreate(false);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const res = await apiDelete(`/api/crm/relationships/${deletingId}`);
    if (res.success) {
      await refetch();
      setDeletingId(null);
    }
  };

  const COMMON_LABELS = ["同事", "合作伙伴", "导师", "客户", "供应商", "上下级", "朋友", "亲属"];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">关联关系网络</h2>
          <p className="text-sm text-muted-foreground">管理联系人、事件之间的关联</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }}>
          <Plus className="h-4 w-4 mr-1" /> 新建关联
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-8">加载中...</div>
          ) : !relationships?.length ? (
            <div className="text-center text-sm text-muted-foreground py-8">暂无关联关系，点击「新建关联」创建</div>
          ) : (
            relationships.map((rel) => (
              <Card key={rel.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={rel.source_type === "contact" ? "default" : "secondary"} className="text-xs">
                          {rel.source_type === "contact" ? "联系人" : "事件"}
                        </Badge>
                        <span className="font-medium">{getEntityLabel(rel.source_type, rel.source_id)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Link2 className="h-4 w-4" />
                        {rel.label ? (
                          <Badge variant="outline" className="text-xs">{rel.label}</Badge>
                        ) : (
                          <span className="text-xs">关联</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={rel.target_type === "contact" ? "default" : "secondary"} className="text-xs">
                          {rel.target_type === "contact" ? "联系人" : "事件"}
                        </Badge>
                        <span className="font-medium">{getEntityLabel(rel.target_type, rel.target_id)}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingId(rel.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* 创建关联对话框 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建关联关系</DialogTitle>
            <DialogDescription>在任意两个实体之间建立关联</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>源实体类型</Label>
              <Select value={formSourceType} onValueChange={(v) => { setFormSourceType(v as "contact" | "event"); setFormSourceId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact">联系人</SelectItem>
                  <SelectItem value="event">事件/项目</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>源实体</Label>
              <Select value={formSourceId} onValueChange={setFormSourceId}>
                <SelectTrigger><SelectValue placeholder="选择..." /></SelectTrigger>
                <SelectContent>
                  {formSourceType === "contact"
                    ? contacts?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}{c.company ? ` (${c.company})` : ""}</SelectItem>
                      ))
                    : events?.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.title} ({e.type === "project" ? "项目" : "事件"})</SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>关系标签</Label>
              <Input value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder="如：同事、合作伙伴..." />
              <div className="flex flex-wrap gap-1 mt-1">
                {COMMON_LABELS.map((l) => (
                  <Badge
                    key={l}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted text-xs"
                    onClick={() => setFormLabel(l)}
                  >
                    {l}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>目标实体类型</Label>
              <Select value={formTargetType} onValueChange={(v) => { setFormTargetType(v as "contact" | "event"); setFormTargetId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact">联系人</SelectItem>
                  <SelectItem value="event">事件/项目</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>目标实体</Label>
              <Select value={formTargetId} onValueChange={setFormTargetId}>
                <SelectTrigger><SelectValue placeholder="选择..." /></SelectTrigger>
                <SelectContent>
                  {formTargetType === "contact"
                    ? contacts?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}{c.company ? ` (${c.company})` : ""}</SelectItem>
                      ))
                    : events?.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.title} ({e.type === "project" ? "项目" : "事件"})</SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!formSourceId || !formTargetId}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除该关联关系吗？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
