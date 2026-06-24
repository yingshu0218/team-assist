"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Building2,
  MessageSquare,
  ChevronRight,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFetch, apiPost, apiPut, apiDelete } from "@/hooks/use-data";
import { ExportDialog } from "@/components/export-dialog";
import { CrmTimelineView } from "@/components/crm/crm-timeline-view";
import type { CrmContact, CrmContactLog } from "@/lib/types";
import { groupContacts, type ContactGroupMode } from "@/lib/contact-groups";

export function CrmContactsView() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingContact, setEditingContact] = useState<CrmContact | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [logContactId, setLogContactId] = useState<number | null>(null);

  // 表单状态
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formRegions, setFormRegions] = useState<string[]>([]);
  const [regionInput, setRegionInput] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [groupMode, setGroupMode] = useState<ContactGroupMode>("surname");
  const [logContent, setLogContent] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [showContactTimeline, setShowContactTimeline] = useState(false);

  const url = `/api/crm/contacts${search ? `?search=${encodeURIComponent(search)}` : ""}`;
  const { data: contacts, loading, refetch } = useFetch<CrmContact[]>(url);

  const detailUrl = selectedId ? `/api/crm/contacts/${selectedId}` : null;
  const { data: detail, refetch: refetchDetail } = useFetch<CrmContact>(detailUrl);

  const resetForm = useCallback(() => {
    setFormName("");
    setFormPhone("");
    setFormCompany("");
    setFormRegions([]);
    setRegionInput("");
    setFormNotes("");
  }, []);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    const res = await apiPost<CrmContact>("/api/crm/contacts", {
      name: formName.trim(),
      phone: formPhone.trim() || undefined,
      company: formCompany.trim() || undefined,
      region: formRegions,
      notes: formNotes.trim() || undefined,
    });
    if (res.success) {
      await refetch();
      setShowCreate(false);
      resetForm();
    }
  };

  const handleEdit = async () => {
    if (!editingContact) return;
    const res = await apiPut<CrmContact>(`/api/crm/contacts/${editingContact.id}`, {
      name: formName.trim(),
      phone: formPhone.trim() || null,
      company: formCompany.trim() || null,
      region: formRegions,
      notes: formNotes.trim() || null,
    });
    if (res.success) {
      await refetch();
      if (selectedId === editingContact.id) await refetchDetail();
      setEditingContact(null);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const res = await apiDelete(`/api/crm/contacts/${deletingId}`);
    if (res.success) {
      if (selectedId === deletingId) setSelectedId(null);
      await refetch();
      setDeletingId(null);
    }
  };

  const handleAddLog = async () => {
    if (!logContactId || !logContent.trim()) return;
    const res = await apiPost<CrmContactLog>(`/api/crm/contacts/${logContactId}/logs`, {
      content: logContent.trim(),
    });
    if (res.success) {
      setLogContent("");
      setShowLogDialog(false);
      if (selectedId === logContactId) await refetchDetail();
      await refetch();
    }
  };

  const openEdit = (contact: CrmContact) => {
    setEditingContact(contact);
    setFormName(contact.name);
    setFormPhone(contact.phone || "");
    setFormCompany(contact.company || "");
    setFormRegions(contact.region);
    setRegionInput("");
    setFormNotes(contact.notes || "");
  };

  const contactGroups = useMemo(() => groupContacts(contacts || [], groupMode), [contacts, groupMode]);
  const addRegion = () => {
    const region = regionInput.trim();
    if (region && !formRegions.includes(region)) setFormRegions((regions) => [...regions, region]);
    setRegionInput("");
  };

  return (
    <div className="flex h-full">
      {/* 联系人列表 */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">联系人</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowExport(true)}>
                <Download className="h-4 w-4 mr-1" /> 导出
              </Button>
              <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }}>
                <Plus className="h-4 w-4 mr-1" /> 新建
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索姓名、电话、单位..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={groupMode} onValueChange={(value) => setGroupMode(value as ContactGroupMode)}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="surname">按姓氏分组</SelectItem>
              <SelectItem value="region">按地区分组</SelectItem>
              <SelectItem value="created_at">按添加时间分组</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">加载中...</div>
          ) : !contacts?.length ? (
            <div className="p-4 text-center text-sm text-muted-foreground">暂无联系人</div>
          ) : (
            <div className="flex flex-col gap-3 p-2">
              {contactGroups.map((group) => (
                <section key={group.label}>
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{group.label}</p>
                  <div className="overflow-hidden rounded-md border">
                    {group.items.map((contact) => (
                      <button key={contact.id} className={`w-full border-b p-3 text-left last:border-b-0 hover:bg-muted/50 ${selectedId === contact.id ? "bg-muted" : ""}`} onClick={() => setSelectedId(contact.id)}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{contact.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{[contact.phone, contact.company].filter(Boolean).join(" · ") || "未填写联系方式"}</p>
                          </div>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* 联系人详情 */}
      <div className="flex-1 flex flex-col">
        {selectedId && detail ? (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* 基本信息 */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-[#b87333]/10 text-[#b87333] flex items-center justify-center text-2xl font-medium">
                    {detail.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{detail.name}</h2>
                    {detail.company && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3.5 w-3.5" /> {detail.company}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setLogContactId(detail.id); setShowLogDialog(true); }}>
                    <MessageSquare className="h-4 w-4 mr-1" /> 添加记录
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowContactTimeline(true)}>时间线</Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(detail)}>
                    <Pencil className="h-4 w-4 mr-1" /> 编辑
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeletingId(detail.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 联系信息卡片 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">联系信息</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                  {[["姓名", detail.name], ["联系电话", detail.phone], ["单位", detail.company]].map(([label, value]) => <div key={label} className="min-h-10 rounded-md bg-muted/40 p-2"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1">{value || "　"}</p></div>)}
                  <div className="min-h-10 rounded-md bg-muted/40 p-2"><p className="text-xs text-muted-foreground">地区</p><div className="mt-1 flex flex-wrap gap-1">{detail.region.length ? detail.region.map((region) => <Badge key={region} variant="secondary">{region}</Badge>) : <span>　</span>}</div></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">跟进记录</CardTitle></CardHeader>
                <CardContent>
                  {detail.logs && detail.logs.length > 0 ? (
                    <div className="space-y-3">
                      {detail.logs.map((log: CrmContactLog) => <div key={log.id} className="border-l-2 border-primary/30 pl-3"><p className="text-sm">{log.content}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(log.log_date).toLocaleDateString("zh-CN")}</p></div>)}
                    </div>
                  ) : <p className="text-sm text-muted-foreground">暂无跟进记录</p>}
                </CardContent>
              </Card>

              {/* 所属分组 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">所属分组</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {detail.groups && detail.groups.length > 0 ? (
                      detail.groups.map((g: { id: number; name: string; color: string | null }) => (
                        <Badge key={g.id} variant="outline" style={{ borderColor: g.color || undefined, color: g.color || undefined }}>
                          {g.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">未加入任何分组</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 参与事件 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">参与事件/项目</CardTitle>
                </CardHeader>
                <CardContent>
                  {detail.events && detail.events.length > 0 ? (
                    <div className="space-y-2">
                      {detail.events.map((e: { id: number; title: string; type: string; role?: string | null }) => (
                        <div key={e.id} className="flex items-center gap-2 text-sm">
                          <Badge variant={e.type === "project" ? "default" : "secondary"} className="text-xs">
                            {e.type === "project" ? "项目" : "事件"}
                          </Badge>
                          <span>{e.title}</span>
                          {e.role && <span className="text-muted-foreground">({e.role})</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无参与的事件</p>
                  )}
                </CardContent>
              </Card>

              {/* 关联关系 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">关联关系</CardTitle>
                </CardHeader>
                <CardContent>
                  {detail.relationships && detail.relationships.length > 0 ? (
                    <div className="space-y-2">
                      {detail.relationships.map((r: { id: number; source_type: string; source_id: number; target_type: string; target_id: number; label: string | null }) => (
                        <div key={r.id} className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            {r.source_type === "contact" && r.source_id === detail.id ? "→" : "←"}
                            {r.target_type === "contact" ? "联系人" : "事件"}#{r.target_type === "contact" && r.source_id === detail.id ? r.target_id : r.source_id}
                          </span>
                          {r.label && <Badge variant="outline">{r.label}</Badge>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无关联关系</p>
                  )}
                </CardContent>
              </Card>

            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            选择左侧联系人查看详情
          </div>
        )}
      </div>

      {/* 创建联系人对话框 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建联系人</DialogTitle>
            <DialogDescription>添加新的联系人信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>姓名 *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="联系人姓名" />
            </div>
            <div className="space-y-2">
              <Label>电话</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="联系电话" />
            </div>
            <div className="space-y-2">
              <Label>单位</Label>
              <Input value={formCompany} onChange={(e) => setFormCompany(e.target.value)} placeholder="所在单位" />
            </div>
            <div className="space-y-2"><Label>地区</Label><div className="flex gap-2"><Input value={regionInput} onChange={(e) => setRegionInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRegion(); } }} placeholder="输入地区后回车添加" /><Button type="button" variant="outline" onClick={addRegion}>添加</Button></div><div className="flex flex-wrap gap-1">{formRegions.map((region) => <Badge key={region} variant="secondary" className="cursor-pointer" onClick={() => setFormRegions((regions) => regions.filter((item) => item !== region))}>{region} ×</Badge>)}</div></div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="备注信息" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!formName.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑联系人对话框 */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑联系人</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>姓名 *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>电话</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>单位</Label>
              <Input value={formCompany} onChange={(e) => setFormCompany(e.target.value)} />
            </div>
            <div className="space-y-2"><Label>地区</Label><div className="flex gap-2"><Input value={regionInput} onChange={(e) => setRegionInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRegion(); } }} placeholder="输入地区后回车添加" /><Button type="button" variant="outline" onClick={addRegion}>添加</Button></div><div className="flex flex-wrap gap-1">{formRegions.map((region) => <Badge key={region} variant="secondary" className="cursor-pointer" onClick={() => setFormRegions((regions) => regions.filter((item) => item !== region))}>{region} ×</Badge>)}</div></div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)}>取消</Button>
            <Button onClick={handleEdit} disabled={!formName.trim()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加联系记录对话框 */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加联系记录</DialogTitle>
            <DialogDescription>记录与联系人的沟通内容</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>记录内容 *</Label>
              <Input value={logContent} onChange={(e) => setLogContent(e.target.value)} placeholder="沟通内容、跟进事项..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogDialog(false)}>取消</Button>
            <Button onClick={handleAddLog} disabled={!logContent.trim()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showContactTimeline} onOpenChange={setShowContactTimeline}>
        <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>联系人时间线</DialogTitle></DialogHeader>{selectedId && <CrmTimelineView contactId={selectedId} />}</DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除该联系人吗？所有相关的联系记录和分组关系也将被删除。此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 导出对话框 */}
      <ExportDialog open={showExport} onOpenChange={setShowExport} type="crm" />
    </div>
  );
}
