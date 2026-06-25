"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { Ledger, Team, Todo, TodoChecklistItem, TodoPriority, TodoStatus } from "@/lib/types";
import {
  TODO_PRIORITY_LABELS,
  TODO_STATUS_LABELS,
  TodoMutationPayload,
  optionId,
  parseOptionalId,
} from "./todo-types";

interface TodoDetailPanelProps {
  todo: Todo | null;
  teams: Team[];
  ledgers: Ledger[];
  loading?: boolean;
  onSave: (todoId: number, payload: TodoMutationPayload) => Promise<void>;
  onDelete: (todo: Todo) => Promise<void>;
  onAddChecklistItem: (todoId: number, title: string) => Promise<void>;
  onToggleChecklistItem: (todoId: number, item: TodoChecklistItem) => Promise<void>;
  onDeleteChecklistItem: (todoId: number, itemId: number) => Promise<void>;
}

const STATUS_OPTIONS: TodoStatus[] = ["todo", "doing", "done", "canceled"];
const PRIORITY_OPTIONS: TodoPriority[] = ["low", "medium", "high", "urgent"];

export function TodoDetailPanel({
  todo,
  teams,
  ledgers,
  loading = false,
  onSave,
  onDelete,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
}: TodoDetailPanelProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<TodoStatus>("todo");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [teamId, setTeamId] = useState("none");
  const [ledgerId, setLedgerId] = useState("none");
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!todo) {
      setTitle("");
      setNotes("");
      setStatus("todo");
      setPriority("medium");
      setDueDate("");
      setTeamId("none");
      setLedgerId("none");
      setNewChecklistTitle("");
      return;
    }

    setTitle(todo.title);
    setNotes(todo.notes ?? "");
    setStatus(todo.status);
    setPriority(todo.priority);
    setDueDate(todo.due_date ?? "");
    setTeamId(optionId(todo.team_id));
    setLedgerId(optionId(todo.ledger_id));
    setNewChecklistTitle("");
  }, [todo]);

  if (!todo) {
    return (
      <Card className="min-h-[520px]">
        <CardHeader>
          <CardTitle className="text-base">任务详情</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-96 items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-medium">选择一个任务</p>
            <p className="mt-1 text-xs text-muted-foreground">在右侧查看和编辑任务详情</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const checklist = todo.checklist ?? [];
  const progress = todo.checklistProgress ?? (todo.status === "done" ? 100 : 0);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave(todo.id, {
      title: title.trim(),
      notes: notes.trim() || null,
      status,
      priority,
      due_date: dueDate || null,
      team_id: parseOptionalId(teamId),
      ledger_id: parseOptionalId(ledgerId),
    });
    setSaving(false);
  };

  const handleAddChecklistItem = async () => {
    const trimmedTitle = newChecklistTitle.trim();
    if (!trimmedTitle) return;
    setNewChecklistTitle("");
    await onAddChecklistItem(todo.id, trimmedTitle);
  };

  return (
    <Card className="min-h-[520px]">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">任务详情</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">更新任务字段、账本关联和检查清单</p>
        </div>
        <Badge variant="secondary">{progress}%</Badge>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[620px] pr-3">
          <div className="flex flex-col gap-5">
            {loading && <div className="h-2 animate-pulse rounded bg-muted" />}
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="todo-detail-title">标题</FieldLabel>
                <Input
                  id="todo-detail-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="任务标题"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="todo-detail-notes">备注</FieldLabel>
                <Textarea
                  id="todo-detail-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="补充背景、链接或行动说明"
                  rows={4}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>状态</FieldLabel>
                  <Select value={status} onValueChange={(value: TodoStatus) => setStatus(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {STATUS_OPTIONS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {TODO_STATUS_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>优先级</FieldLabel>
                  <Select value={priority} onValueChange={(value: TodoPriority) => setPriority(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {PRIORITY_OPTIONS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {TODO_PRIORITY_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="todo-detail-due">到期日期</FieldLabel>
                  <Input
                    id="todo-detail-due"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>分组</FieldLabel>
                  <Select value={teamId} onValueChange={setTeamId}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">未归属</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={String(team.id)}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel>关联账本</FieldLabel>
                  <Select value={ledgerId} onValueChange={setLedgerId}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">未关联账本</SelectItem>
                        {ledgers.map((ledger) => (
                          <SelectItem key={ledger.id} value={String(ledger.id)}>
                            {ledger.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FieldGroup>

            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={!title.trim() || saving}>
                保存变更
              </Button>
              <Button variant="outline" onClick={() => onDelete(todo)}>
                删除任务
              </Button>
            </div>

            <Separator />

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">检查清单</h3>
                <span className="text-xs text-muted-foreground">{checklist.length} 项</span>
              </div>
              <Progress value={progress} />
              <div className="flex gap-2">
                <Input
                  value={newChecklistTitle}
                  onChange={(event) => setNewChecklistTitle(event.target.value)}
                  placeholder="添加清单项"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleAddChecklistItem();
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddChecklistItem}>
                  <Plus />
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {checklist.length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    暂无清单项
                  </p>
                ) : (
                  checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-md border p-2">
                      <Checkbox
                        checked={item.is_done}
                        onCheckedChange={() => onToggleChecklistItem(todo.id, item)}
                        aria-label={`切换 ${item.title} 完成状态`}
                      />
                      <span className={item.is_done ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm"}>
                        {item.title}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteChecklistItem(todo.id, item.id)}
                        aria-label={`删除 ${item.title}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
