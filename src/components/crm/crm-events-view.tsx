"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Calendar,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLedger } from "@/hooks/use-ledger";
import { useFetch, apiPost, apiPut, apiDelete } from "@/hooks/use-data";
import type { CrmEvent, CrmContact } from "@/lib/types";

export function CrmEventsView() {
  const { activeLedgerId } = useLedger();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CrmEvent | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // 表单状态
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<"event" | "project">("event");

  // 参与者管理
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");

  const baseUrl = activeLedgerId
    ? `/api/crm/events?ledger_id=${activeLedgerId}${typeFilter !== "all" ? `&type=${typeFilter}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`
    : null;
  const { data: events, loading, refetch } = useFetch<CrmEvent[]>(baseUrl);

  const detailUrl = selectedEventId ? `/api/crm/events/${selectedEventId}` : null;
  const { data: detail, refetch: refetchDetail } = useFetch<CrmEvent>(detailUrl);

  // 联系人列表（用于添加参与者）
  const contactsUrl = `/api/crm/contacts${participantSearch ? `?search=${encodeURIComponent(participantSearch)}` : ""}`;
  const { data: allContacts } = useFetch<CrmContact[]>(showAddParticipant ? contactsUrl : null);

  const resetForm = useCallback(() => {
    setFormTitle("");
    setFormType("event");
  }, []);

  const handleCreate = async () => {
    if (!activeLedgerId || !formTitle.trim()) return;
    const res = await apiPost<CrmEvent>("/api/crm/events", {
      ledger_id: activeLedgerId,
      title: formTitle.trim(),
      type: formType,
    });
    if (res.success) {
      await refetch();
      setShowCreate(false);
      resetForm();
    }
  };

  const handleEdit = async () => {
    if (!editingEvent) return;
    const res = await apiPut<CrmEvent>(`/api/crm/events/${editingEvent.id}`, {
      title: formTitle.trim(),
      type: formType,
    });
    if (res.success) {
      await refetch();
      if (selectedEventId === editingEvent.id) await refetchDetail();
      setEditingEvent(null);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const res = await apiDelete(`/api/crm/events/${deletingId}`);
    if (res.success) {
      await refetch();
      if (selectedEventId === deletingId) setSelectedEventId(null);
      setDeletingId(null);
    }
  };

  const openEdit = (event: CrmEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormType(event.type);
  };

  const handleAddParticipant = async (contactId: number) => {
    if (!selectedEventId) return;
    const res = await apiPost("/api/crm/events/" + selectedEventId + "/participants", {
      contact_id: contactId,
    });
    if (res.success) {
      await refetchDetail();
      await refetch();
      setShowAddParticipant(false);
    }
  };

  const handleRemoveParticipant = async (participantId: number) => {
    if (!selectedEventId) return;
    const res = await apiDelete(`/api/crm/events/${selectedEventId}/participants`, {
      id: participantId,
    });
    if (res.success) {
      await refetchDetail();
      await refetch();
    }
  };

  const typeIcon = (type: string) => type === "project" ? Target : Calendar;
  const typeLabel = (type: string) => type === "project" ? "项目" : "事件";
  const typeBadgeColor = (type: string) =>
    type === "project"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";

  if (!activeLedgerId) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">请先选择一个账本</div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">事件与项目</h2>
          <p className="text-muted-foreground">管理关联事件和项目，用于联系人关联</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreate(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          新建
        </Button>
      </div>

      {/* 筛选栏 */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索事件/项目..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="类型筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="event">事件</SelectItem>
            <SelectItem value="project">项目</SelectItem>
          </SelectContent>
        </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">列表</TabsTrigger>
          <TabsTrigger value="detail" disabled={!selectedEventId}>详情</TabsTrigger>
        </TabsList>

        {/* 列表 */}
        <TabsContent value="list">
          {loading ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">加载中...</CardContent></Card>
          ) : !events?.length ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">暂无事件或项目</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                const Icon = typeIcon(event.type);
                return (
                  <Card
                    key={event.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedEventId === event.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-base">{event.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className={typeBadgeColor(event.type)}>
                            {typeLabel(event.type)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); openEdit(event); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={(e) => { e.stopPropagation(); setDeletingId(event.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        参与者: {event.participantCount ?? 0} 人
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 详情 */}
        <TabsContent value="detail">
          {detail ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {(() => { const Icon = typeIcon(detail.type); return <Icon className="h-5 w-5 text-muted-foreground" />; })()}
                    <div>
                      <CardTitle>{detail.title}</CardTitle>
                      <Badge variant="secondary" className={typeBadgeColor(detail.type) + " mt-1"}>
                        {typeLabel(detail.type)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* 参与者 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">参与者</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setShowAddParticipant(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    添加
                  </Button>
                </CardHeader>
                <CardContent>
                  {!detail.participants?.length ? (
                    <p className="text-sm text-muted-foreground">暂无参与者</p>
                  ) : (
                    <ScrollArea className="max-h-[300px]">
                      <div className="space-y-2">
                        {detail.participants.map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded-lg border p-2">
                            <div>
                              <span className="text-sm font-medium">{p.contact?.name || `联系人#${p.contact_id}`}</span>
                              {p.role && <span className="ml-2 text-xs text-muted-foreground">({p.role})</span>}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleRemoveParticipant(p.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">请选择一个事件查看详情</div>
          )}
        </TabsContent>
      </Tabs>

      {/* 创建/编辑对话框 */}
      <Dialog open={showCreate || !!editingEvent} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditingEvent(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? "编辑事件" : "新建事件/项目"}</DialogTitle>
            <DialogDescription>
              {editingEvent ? "修改事件信息" : "创建一个事件或项目，用于联系人关联"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>标题</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="事件或项目名称"
              />
            </div>
            <div className="space-y-2">
              <Label>类型</Label>
              <Select value={formType} onValueChange={(v: "event" | "project") => setFormType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">事件</SelectItem>
                  <SelectItem value="project">项目</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditingEvent(null); resetForm(); }}>取消</Button>
            <Button onClick={editingEvent ? handleEdit : handleCreate}>
              {editingEvent ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>删除后无法恢复，关联的参与者也会被清除。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 添加参与者 */}
      <Dialog open={showAddParticipant} onOpenChange={setShowAddParticipant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加参与者</DialogTitle>
            <DialogDescription>从联系人列表中选择添加</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="搜索联系人..."
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
            />
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1">
                {allContacts?.map((c) => {
                  const already = detail?.participants?.some((p) => p.contact_id === c.id);
                  return (
                    <button
                      key={c.id}
                      className={`w-full text-left rounded-lg border p-2.5 text-sm transition-colors ${already ? "opacity-50 cursor-not-allowed" : "hover:bg-muted cursor-pointer"}`}
                      disabled={already}
                      onClick={() => !already && handleAddParticipant(c.id)}
                    >
                      <div className="font-medium">{c.name}</div>
                      {c.company && <div className="text-xs text-muted-foreground">{c.company}</div>}
                      {already && <div className="text-xs text-muted-foreground">已添加</div>}
                    </button>
                  );
                })}
                {!allContacts?.length && (
                  <p className="text-sm text-muted-foreground text-center py-4">未找到联系人</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
