"use client";

import { useState } from "react";
import {
  BookOpen,
  LayoutDashboard,
  Receipt,
  Tags,
  FolderTree,
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  ChevronDown,
  Settings,
  Shield,
  Users,
  Contact,
  Calendar,
  Link2,
  Network,
  ListTodo,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useLedger } from "@/hooks/use-ledger";
import { apiPost, apiPut, apiDelete } from "@/hooks/use-data";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Ledger } from "@/lib/types";
import type { Tab } from "@/app/page";

interface AppSidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { ledgers, activeLedger, activeLedgerId, setActiveLedgerId, refreshLedgers } = useLedger();
  const [showCreateLedger, setShowCreateLedger] = useState(false);
  const [ledgerName, setLedgerName] = useState("");
  const [ledgerDesc, setLedgerDesc] = useState("");
  const [ledgerInitialBalance, setLedgerInitialBalance] = useState("0");
  const [editingLedger, setEditingLedger] = useState<Ledger | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editInitialBalance, setEditInitialBalance] = useState("0");

  const accountItems = [
    { id: "transactions" as Tab, label: "收支明细", icon: Receipt },
    { id: "categories" as Tab, label: "分类管理", icon: FolderTree },
    { id: "tags" as Tab, label: "标签管理", icon: Tags },
    { id: "todos" as Tab, label: "待办事项", icon: ListTodo },
  ];

  const crmNavItems = [
    { id: "crm-contacts" as Tab, label: "联系人", icon: Contact },
    { id: "crm-groups" as Tab, label: "分组管理", icon: Users },
    { id: "crm-events" as Tab, label: "事件项目", icon: Calendar },
    { id: "crm-relationships" as Tab, label: "关联关系", icon: Link2 },
    { id: "crm-graph" as Tab, label: "关系图谱", icon: Network },
    { id: "crm-timeline" as Tab, label: "时间线", icon: Calendar },
  ];

  const handleCreateLedger = async () => {
    if (!ledgerName.trim()) return;
    const res = await apiPost<Ledger>("/api/ledgers", {
      name: ledgerName.trim(),
      description: ledgerDesc.trim(),
      initial_balance: ledgerInitialBalance || "0",
    });
    if (res.success && res.data) {
      await refreshLedgers();
      setActiveLedgerId(res.data.id);
      setLedgerName("");
      setLedgerDesc("");
      setLedgerInitialBalance("0");
      setShowCreateLedger(false);
    }
  };

  const handleEditLedger = async () => {
    if (!editingLedger || !editName.trim()) return;
    const res = await apiPut<Ledger>(`/api/ledgers/${editingLedger.id}`, {
      name: editName.trim(),
      description: editDesc.trim(),
      initial_balance: editInitialBalance || "0",
    });
    if (res.success) {
      await refreshLedgers();
      setEditingLedger(null);
    }
  };

  const handleDeleteLedger = async (ledger: Ledger) => {
    if (ledgers.length <= 1) {
      alert("至少保留一个账本");
      return;
    }
    if (!confirm(`确定删除账本「${ledger.name}」吗？所有关联的收支记录将一并删除。`)) return;
    const res = await apiDelete(`/api/ledgers/${ledger.id}`);
    if (res.success) {
      await refreshLedgers();
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-foreground">团队管理助手</h1>
            <p className="text-xs text-muted-foreground">账本 & 客户关系</p>
          </div>
          <ThemeToggle />
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* 概览 — 独立按钮 */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "dashboard"}
                  onClick={() => onTabChange("dashboard")}
                  className="font-medium"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>概览</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* 账目区域：账本选择 + 子菜单 */}
        <SidebarGroup>
          <SidebarGroupLabel>账目 / Accounting</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* 账本切换下拉 */}
            <div className="mb-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                    <span className="flex items-center gap-2 truncate">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <span className="truncate font-medium">
                        {activeLedger?.name || "选择账本"}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {ledgers.map((ledger) => (
                    <DropdownMenuItem
                      key={ledger.id}
                      onClick={() => setActiveLedgerId(ledger.id)}
                      className={ledger.id === activeLedgerId ? "bg-accent" : ""}
                    >
                      <span className="flex items-center gap-2 flex-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: ledger.id === activeLedgerId
                              ? "var(--primary)"
                              : "var(--muted-foreground)",
                          }}
                        />
                        <span className="truncate">{ledger.name}</span>
                      </span>
                      {ledger.id === activeLedgerId && (
                        <span className="text-primary text-xs font-medium">当前</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowCreateLedger(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    创建新账本
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 当前账本操作 */}
              {activeLedger && (
                <div className="mt-1 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 flex-1 justify-start gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditingLedger(activeLedger);
                      setEditName(activeLedger.name);
                      setEditDesc(activeLedger.description || "");
                      setEditInitialBalance(activeLedger.initial_balance);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                    编辑
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => {
                        setEditingLedger(activeLedger);
                        setEditName(activeLedger.name);
                        setEditDesc(activeLedger.description || "");
                        setEditInitialBalance(activeLedger.initial_balance);
                      }}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        重命名
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteLedger(activeLedger)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        删除账本
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {ledgers.length > 1 && (
                <p className="mt-1.5 text-[10px] text-muted-foreground px-1">
                  共 {ledgers.length} 个账本，点击上方切换
                </p>
              )}
            </div>

            {/* 账目子菜单 */}
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => onTabChange(item.id)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* CRM 导航 */}
        <SidebarGroup>
          <SidebarGroupLabel>客户关系 / CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {crmNavItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => onTabChange(item.id)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === "settings"}
              onClick={() => onTabChange("settings")}
            >
              <Settings className="h-4 w-4" />
              <span>同步与备份</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === "auth-settings"}
              onClick={() => onTabChange("auth-settings")}
            >
              <Shield className="h-4 w-4" />
              <span>系统设置</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {activeLedger && (
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">当前账本</p>
            <p className="text-sm font-medium text-foreground truncate">{activeLedger.name}</p>
            {activeLedger.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{activeLedger.description}</p>
            )}
          </div>
        )}
      </SidebarFooter>

      {/* 创建账本对话框 */}
      <Dialog open={showCreateLedger} onOpenChange={setShowCreateLedger}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新账本</DialogTitle>
            <DialogDescription>创建后将自动初始化默认收支分类</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ledger-name">账本名称</Label>
              <Input
                id="ledger-name"
                value={ledgerName}
                onChange={(e) => setLedgerName(e.target.value)}
                placeholder="如：日常开销、旅行基金"
                onKeyDown={(e) => e.key === "Enter" && handleCreateLedger()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ledger-desc">描述（可选）</Label>
              <Input
                id="ledger-desc"
                value={ledgerDesc}
                onChange={(e) => setLedgerDesc(e.target.value)}
                placeholder="账本备注说明"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ledger-initial-balance">初始余额</Label>
              <Input
                id="ledger-initial-balance"
                type="number"
                step="0.01"
                value={ledgerInitialBalance}
                onChange={(e) => setLedgerInitialBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateLedger(false)}>取消</Button>
            <Button onClick={handleCreateLedger} disabled={!ledgerName.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑账本对话框 */}
      <Dialog open={!!editingLedger} onOpenChange={(open) => !open && setEditingLedger(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑账本</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">账本名称</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">描述</Label>
              <Input
                id="edit-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-initial-balance">初始余额</Label>
              <Input
                id="edit-initial-balance"
                type="number"
                step="0.01"
                value={editInitialBalance}
                onChange={(e) => setEditInitialBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLedger(null)}>取消</Button>
            <Button onClick={handleEditLedger} disabled={!editName.trim()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
