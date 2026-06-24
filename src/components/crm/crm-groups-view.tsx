"use client";

import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
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
import { useLedger } from "@/hooks/use-ledger";
import { useFetch, apiPost, apiPut, apiDelete } from "@/hooks/use-data";
import type { CrmGroup, CrmContact } from "@/lib/types";

export function CrmGroupsView() {
  const { activeLedgerId } = useLedger();
  const [showCreate, setShowCreate] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CrmGroup | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);

  // 表单状态
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [addMemberSearch, setAddMemberSearch] = useState("");

  const url = activeLedgerId ? `/api/crm/groups?ledger_id=${activeLedgerId}` : null;
  const { data: groups, loading, refetch } = useFetch<CrmGroup[]>(url);

  // 获取分组下的联系人
  const contactsUrl = `/api/crm/contacts?group_id=${selectedGroupId || ""}`;
  const { data: groupContacts, refetch: refetchGroupContacts } = useFetch<CrmContact[]>(
    selectedGroupId ? contactsUrl : null
  );

  // 可添加的联系人列表（搜索用）
  const allContactsUrl = `/api/crm/contacts${addMemberSearch ? `?search=${encodeURIComponent(addMemberSearch)}` : ""}`;
  const { data: allContacts } = useFetch<CrmContact[]>(showAddMember ? allContactsUrl : null);

  const resetForm = useCallback(() => {
    setFormName("");
    setFormColor("");
    setFormDesc("");
  }, []);

  const handleCreate = async () => {
    if (!activeLedgerId || !formName.trim()) return;
    const res = await apiPost<CrmGroup>("/api/crm/groups", {
      ledger_id: activeLedgerId,
      name: formName.trim(),
      color: formColor.trim() || null,
      description: formDesc.trim() || null,
    });
    if (res.success) {
      await refetch();
      setShowCreate(false);
      resetForm();
    }
  };

  const handleEdit = async () => {
    if (!editingGroup) return;
    const res = await apiPut<CrmGroup>(`/api/crm/groups/${editingGroup.id}`, {
      name: formName.trim(),
      color: formColor.trim() || null,
      description: formDesc.trim() || null,
    });
    if (res.success) {
      await refetch();
      setEditingGroup(null);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const res = await apiDelete(`/api/crm/groups/${deletingId}`);
    if (res.success) {
      if (selectedGroupId === deletingId) setSelectedGroupId(null);
      await refetch();
      setDeletingId(null);
    }
  };

  const handleAddMember = async (contactId: number) => {
    if (!selectedGroupId) return;
    const res = await apiPost(`/api/crm/groups/${selectedGroupId}/members`, {
      contact_id: contactId,
    });
    if (res.success) {
      await refetchGroupContacts();
      await refetch();
    }
  };

  const handleRemoveMember = async (contactId: number) => {
    if (!selectedGroupId) return;
    const res = await apiDelete(`/api/crm/groups/${selectedGroupId}/members`, {
      contact_id: contactId,
    });
    if (res.success) {
      await refetchGroupContacts();
      await refetch();
    }
  };

  const openEdit = (group: CrmGroup) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormColor(group.color || "");
    setFormDesc(group.description || "");
  };

  return (
    <div className="flex h-full">
      {/* 分组列表 */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">分组管理</h2>
            <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }}>
              <Plus className="h-4 w-4 mr-1" /> 新建
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">加载中...</div>
          ) : !groups?.length ? (
            <div className="p-4 text-center text-sm text-muted-foreground">暂无分组</div>
          ) : (
            <div className="divide-y">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className={`p-3 hover:bg-muted/50 transition-colors cursor-pointer ${selectedGroupId === group.id ? "bg-muted" : ""}`}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color || "#94a3b8" }} />
                      <span className="text-sm font-medium">{group.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        <Users className="h-3 w-3 mr-0.5" />
                        {group.memberCount || 0}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openEdit(group); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingId(group.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {group.description && (
                    <p className="text-xs text-muted-foreground mt-1 pl-5">{group.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* 分组详情 */}
      <div className="flex-1 flex flex-col">
        {selectedGroupId ? (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">分组成员</h3>
                <Button size="sm" onClick={() => { setAddMemberSearch(""); setShowAddMember(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> 添加成员
                </Button>
              </div>
              {groupContacts && groupContacts.length > 0 ? (
                <div className="space-y-2">
                  {groupContacts.map((contact) => (
                    <Card key={contact.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[#b87333]/10 text-[#b87333] flex items-center justify-center text-sm font-medium">
                            {contact.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{contact.name}</p>
                            {contact.company && (
                              <p className="text-xs text-muted-foreground">{contact.company}</p>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveMember(contact.id)}>
                          移除
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">该分组暂无成员</p>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            选择左侧分组查看成员
          </div>
        )}
      </div>

      {/* 创建分组对话框 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建分组</DialogTitle>
            <DialogDescription>创建联系人分组</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>名称 *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="分组名称" />
            </div>
            <div className="space-y-2">
              <Label>颜色</Label>
              <div className="flex gap-2 items-center">
                <Input type="color" value={formColor || "#94a3b8"} onChange={(e) => setFormColor(e.target.value)} className="w-10 h-10 p-1 cursor-pointer" />
                <Input value={formColor} onChange={(e) => setFormColor(e.target.value)} placeholder="#94a3b8" className="flex-1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="分组说明" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!formName.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑分组对话框 */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑分组</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>名称 *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>颜色</Label>
              <div className="flex gap-2 items-center">
                <Input type="color" value={formColor || "#94a3b8"} onChange={(e) => setFormColor(e.target.value)} className="w-10 h-10 p-1 cursor-pointer" />
                <Input value={formColor} onChange={(e) => setFormColor(e.target.value)} className="flex-1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>取消</Button>
            <Button onClick={handleEdit} disabled={!formName.trim()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加成员对话框 */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加成员</DialogTitle>
            <DialogDescription>搜索并选择要添加到分组的联系人</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="搜索联系人..."
              value={addMemberSearch}
              onChange={(e) => setAddMemberSearch(e.target.value)}
            />
            <ScrollArea className="h-60">
              {allContacts?.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer"
                  onClick={() => { handleAddMember(contact.id); }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-[#b87333]/10 text-[#b87333] flex items-center justify-center text-xs font-medium">
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm">{contact.name}</p>
                      {contact.company && <p className="text-xs text-muted-foreground">{contact.company}</p>}
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
              {allContacts?.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">未找到联系人</p>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>删除分组后，成员关系将被清理，但联系人不会被删除。此操作不可撤销。</AlertDialogDescription>
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
