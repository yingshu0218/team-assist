"use client";

import type { Ledger, Team, TodoPriority, TodoStatus } from "@/lib/types";

export type TodoTeamFilterValue = "all" | "none" | number;

export interface TodoMutationPayload {
  title?: string;
  notes?: string | null;
  status?: TodoStatus;
  priority?: TodoPriority;
  due_date?: string | null;
  team_id?: number | null;
  ledger_id?: number | null;
}

export interface TeamMutationPayload {
  name: string;
  color?: string | null;
  description?: string | null;
}

export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  todo: "待处理",
  doing: "进行中",
  done: "已完成",
  canceled: "已取消",
};

export const TODO_PRIORITY_LABELS: Record<TodoPriority, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "紧急",
};

export function optionId(value: number | null): string {
  return value === null ? "none" : String(value);
}

export function parseOptionalId(value: string): number | null {
  return value === "none" ? null : Number(value);
}

export function findTeamName(teams: Team[], teamId: number | null): string {
  if (teamId === null) return "未归属";
  return teams.find((team) => team.id === teamId)?.name ?? "未知分组";
}

export function findLedgerName(ledgers: Ledger[], ledgerId: number | null): string {
  if (ledgerId === null) return "未关联账本";
  return ledgers.find((ledger) => ledger.id === ledgerId)?.name ?? "未知账本";
}
