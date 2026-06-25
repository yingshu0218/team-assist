"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Ledger, Team, TodoPriority, TodoStatus } from "@/lib/types";
import {
  TODO_PRIORITY_LABELS,
  TODO_STATUS_LABELS,
  TodoMutationPayload,
  parseOptionalId,
} from "./todo-types";

interface TodoDialogProps {
  open: boolean;
  teams: Team[];
  ledgers: Ledger[];
  defaultTeamId: number | null;
  defaultLedgerId: number | null;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: TodoMutationPayload) => Promise<void>;
}

const STATUS_OPTIONS: TodoStatus[] = ["todo", "doing", "done", "canceled"];
const PRIORITY_OPTIONS: TodoPriority[] = ["low", "medium", "high", "urgent"];

export function TodoDialog({
  open,
  teams,
  ledgers,
  defaultTeamId,
  defaultLedgerId,
  onOpenChange,
  onCreate,
}: TodoDialogProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<TodoStatus>("todo");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [teamId, setTeamId] = useState("none");
  const [ledgerId, setLedgerId] = useState("none");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setNotes("");
    setStatus("todo");
    setPriority("medium");
    setDueDate("");
    setTeamId(defaultTeamId === null ? "none" : String(defaultTeamId));
    setLedgerId(defaultLedgerId === null ? "none" : String(defaultLedgerId));
  }, [defaultLedgerId, defaultTeamId, open]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onCreate({
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>新建任务</DialogTitle>
          <DialogDescription>创建一个可关联分组和账本的待办事项</DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-4 py-2">
          <Field>
            <FieldLabel htmlFor="new-todo-title">标题</FieldLabel>
            <Input
              id="new-todo-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：整理本周客户回访清单"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-todo-notes">备注</FieldLabel>
            <Textarea
              id="new-todo-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="可选"
              rows={3}
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
              <FieldLabel htmlFor="new-todo-due">到期日期</FieldLabel>
              <Input
                id="new-todo-due"
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim() || saving}>
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
