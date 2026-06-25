"use client";

import { useEffect, useMemo, useState } from "react";
import { ListTodo, Plus, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiDelete, apiPost, apiPut, useFetch } from "@/hooks/use-data";
import { useLedger } from "@/hooks/use-ledger";
import { computeTodoStats, todayDateString } from "@/lib/todos";
import type { Ledger, Team, Todo, TodoChecklistItem } from "@/lib/types";
import { TodoDetailPanel } from "./todo-detail-panel";
import { TodoDialog } from "./todo-dialog";
import { TodoList } from "./todo-list";
import { TodoStatsCards } from "./todo-stats-cards";
import { TodoTeamFilter } from "./todo-team-filter";
import { TeamDialog } from "./team-dialog";
import type { TeamMutationPayload, TodoMutationPayload, TodoTeamFilterValue } from "./todo-types";

function todosUrlForFilter(filter: TodoTeamFilterValue): string {
  if (filter === "all") return "/api/todos";
  if (filter === "none") return "/api/todos?team_id=none";
  return `/api/todos?team_id=${filter}`;
}

export function TodosView() {
  const { activeLedgerId } = useLedger();
  const [selectedFilter, setSelectedFilter] = useState<TodoTeamFilterValue>("all");
  const [selectedTodoId, setSelectedTodoId] = useState<number | null>(null);
  const [today, setToday] = useState("");
  const [showTodoDialog, setShowTodoDialog] = useState(false);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  useEffect(() => {
    setToday(todayDateString());
  }, []);

  const todosUrl = todosUrlForFilter(selectedFilter);
  const { data: teams, loading: teamsLoading, refetch: refetchTeams } = useFetch<Team[]>("/api/teams");
  const { data: ledgers, loading: ledgersLoading } = useFetch<Ledger[]>("/api/ledgers");
  const {
    data: todos,
    loading: todosLoading,
    error: todosError,
    refetch: refetchTodos,
  } = useFetch<Todo[]>(todosUrl);
  const {
    data: selectedTodo,
    loading: selectedTodoLoading,
    refetch: refetchSelectedTodo,
  } = useFetch<Todo>(selectedTodoId ? `/api/todos/${selectedTodoId}` : null);

  const teamList = teams ?? [];
  const ledgerList = ledgers ?? [];
  const todoList = todos ?? [];
  const effectiveToday = today || "9999-12-31";
  const stats = useMemo(() => computeTodoStats(todoList, effectiveToday), [todoList, effectiveToday]);
  const selectedTeam = typeof selectedFilter === "number"
    ? teamList.find((team) => team.id === selectedFilter) ?? null
    : null;
  const detailTodo = selectedTodo?.id === selectedTodoId ? selectedTodo : null;
  const detailLoading = selectedTodoId !== null && (selectedTodoLoading || !detailTodo || ledgersLoading);

  useEffect(() => {
    if (todoList.length === 0) {
      setSelectedTodoId(null);
      return;
    }
    setSelectedTodoId((current) => {
      if (current !== null && todoList.some((todo) => todo.id === current)) return current;
      return todoList[0]?.id ?? null;
    });
  }, [todoList]);

  const refreshTodosAndTeams = async () => {
    await Promise.all([refetchTodos(), refetchTeams(), refetchSelectedTodo()]);
  };

  const handleCreateTodo = async (payload: TodoMutationPayload) => {
    const result = await apiPost<Todo>("/api/todos", payload);
    if (!result.success) {
      alert(result.error ?? "创建任务失败");
      return;
    }
    if (result.data) setSelectedTodoId(result.data.id);
    setShowTodoDialog(false);
    await refreshTodosAndTeams();
  };

  const handleSaveTodo = async (todoId: number, payload: TodoMutationPayload) => {
    const result = await apiPut<Todo>(`/api/todos/${todoId}`, payload);
    if (!result.success) {
      alert(result.error ?? "保存任务失败");
      return;
    }
    await refreshTodosAndTeams();
  };

  const handleDeleteTodo = async (todo: Todo) => {
    if (!confirm(`确定删除任务「${todo.title}」吗？`)) return;
    const result = await apiDelete(`/api/todos/${todo.id}`);
    if (!result.success) {
      alert(result.error ?? "删除任务失败");
      return;
    }
    setSelectedTodoId(null);
    await refreshTodosAndTeams();
  };

  const handleToggleDone = async (todo: Todo) => {
    await handleSaveTodo(todo.id, { status: todo.status === "done" ? "todo" : "done" });
  };

  const handleSaveSelectedTodo = async (todoId: number, payload: TodoMutationPayload) => {
    if (todoId !== selectedTodoId) return;
    await handleSaveTodo(todoId, payload);
  };

  const handleDeleteSelectedTodo = async (todo: Todo) => {
    if (todo.id !== selectedTodoId) return;
    await handleDeleteTodo(todo);
  };

  const handleAddChecklistItem = async (todoId: number, title: string) => {
    if (todoId !== selectedTodoId) return;
    const result = await apiPost<TodoChecklistItem>(`/api/todos/${todoId}/checklist`, { title });
    if (!result.success) {
      alert(result.error ?? "添加清单项失败");
      return;
    }
    await refreshTodosAndTeams();
  };

  const handleToggleChecklistItem = async (todoId: number, item: TodoChecklistItem) => {
    if (todoId !== selectedTodoId) return;
    const result = await apiPut<TodoChecklistItem>(
      `/api/todos/${todoId}/checklist/${item.id}`,
      { is_done: !item.is_done },
    );
    if (!result.success) {
      alert(result.error ?? "更新清单项失败");
      return;
    }
    await refreshTodosAndTeams();
  };

  const handleDeleteChecklistItem = async (todoId: number, itemId: number) => {
    if (todoId !== selectedTodoId) return;
    const result = await apiDelete(`/api/todos/${todoId}/checklist/${itemId}`);
    if (!result.success) {
      alert(result.error ?? "删除清单项失败");
      return;
    }
    await refreshTodosAndTeams();
  };

  const handleSaveTeam = async (payload: TeamMutationPayload, teamId?: number) => {
    const result = teamId
      ? await apiPut<Team>(`/api/teams/${teamId}`, payload)
      : await apiPost<Team>("/api/teams", payload);
    if (!result.success) {
      alert(result.error ?? "保存分组失败");
      return;
    }
    if (result.data && !teamId) setSelectedFilter(result.data.id);
    setShowTeamDialog(false);
    setEditingTeam(null);
    await refreshTodosAndTeams();
  };

  const openCreateTeamDialog = () => {
    setEditingTeam(null);
    setShowTeamDialog(true);
  };

  const openEditTeamDialog = () => {
    if (!selectedTeam) return;
    setEditingTeam(selectedTeam);
    setShowTeamDialog(true);
  };

  return (
    <main className="flex-1 p-4 sm:p-6">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ListTodo className="text-muted-foreground" />
              <h2 className="text-xl font-semibold tracking-tight">待办事项</h2>
              <Badge variant="secondary">Workbench</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              用清单视图管理团队分组、账本关联和任务检查项
            </p>
            {todosError && <p className="mt-2 text-sm text-destructive">{todosError}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowTodoDialog(true)}>
              <Plus />
              新建任务
            </Button>
            <Button variant="outline" onClick={openCreateTeamDialog}>
              <Plus />
              新建分组
            </Button>
            <Button variant="outline" onClick={openEditTeamDialog} disabled={!selectedTeam}>
              <Settings2 />
              编辑当前分组
            </Button>
          </div>
        </header>

        <Tabs value="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">清单</TabsTrigger>
            <TabsTrigger value="board" disabled>
              看板
            </TabsTrigger>
            <TabsTrigger value="calendar" disabled>
              日历
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <TodoStatsCards stats={stats} loading={todosLoading || !today} />

        <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold">分组筛选</h3>
            <p className="text-xs text-muted-foreground">
              未归属代表没有绑定分组的任务；账本关联在任务详情中独立设置
            </p>
          </div>
          <TodoTeamFilter
            teams={teamList}
            selected={selectedFilter}
            onChange={setSelectedFilter}
          />
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <TodoList
            todos={todoList}
            selectedTodoId={selectedTodoId}
            today={effectiveToday}
            loading={todosLoading || teamsLoading}
            onSelect={(todo) => setSelectedTodoId(todo.id)}
            onToggleDone={handleToggleDone}
          />
          <TodoDetailPanel
            todo={detailTodo}
            teams={teamList}
            ledgers={ledgerList}
            loading={detailLoading}
            onSave={handleSaveSelectedTodo}
            onDelete={handleDeleteSelectedTodo}
            onAddChecklistItem={handleAddChecklistItem}
            onToggleChecklistItem={handleToggleChecklistItem}
            onDeleteChecklistItem={handleDeleteChecklistItem}
          />
        </div>
      </div>

      <TodoDialog
        open={showTodoDialog}
        teams={teamList}
        ledgers={ledgerList}
        defaultTeamId={typeof selectedFilter === "number" ? selectedFilter : null}
        defaultLedgerId={activeLedgerId}
        onOpenChange={setShowTodoDialog}
        onCreate={handleCreateTodo}
      />
      <TeamDialog
        open={showTeamDialog}
        team={editingTeam}
        onOpenChange={(open) => {
          setShowTeamDialog(open);
          if (!open) setEditingTeam(null);
        }}
        onSave={handleSaveTeam}
      />
    </main>
  );
}
