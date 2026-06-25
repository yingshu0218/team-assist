import type {
  Todo,
  TodoChecklistItem,
  TodoDateBucket,
  TodoPriority,
  TodoStats,
  TodoStatus,
} from "@/lib/types";

export const STATUS_VALUES: TodoStatus[] = ["todo", "doing", "done", "canceled"];
export const PRIORITY_VALUES: TodoPriority[] = ["low", "medium", "high", "urgent"];

export function isTodoStatus(value: unknown): value is TodoStatus {
  return typeof value === "string" && STATUS_VALUES.includes(value as TodoStatus);
}

export function isTodoPriority(value: unknown): value is TodoPriority {
  return typeof value === "string" && PRIORITY_VALUES.includes(value as TodoPriority);
}

export function normalizeOptionalId(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "" || value === "none") return null;

  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new Error("ID 必须是正整数或 none");
  }

  return numeric;
}

export function normalizeDateOnly(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "" || value === "none") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("日期必须为空或 YYYY-MM-DD");
  }

  return value;
}

export function computeChecklistProgress(
  checklist: TodoChecklistItem[],
  fallbackStatus: TodoStatus = "todo",
): number {
  if (checklist.length === 0) return fallbackStatus === "done" ? 100 : 0;

  const doneCount = checklist.filter((item) => item.is_done).length;
  return Math.round((doneCount / checklist.length) * 100);
}

export function getTodoDateBucket(todo: Todo, today: string): TodoDateBucket {
  if (todo.status === "done") return "done";
  if (!todo.due_date) return "no_date";
  if (todo.due_date < today) return "overdue";
  if (todo.due_date === today) return "today";
  return "future";
}

export function computeTodoStats(todos: Todo[], today: string): TodoStats {
  const activeTodos = todos.filter((todo) => todo.status !== "canceled");
  const done = activeTodos.filter((todo) => todo.status === "done").length;
  const denominator = activeTodos.length;

  return {
    today: activeTodos.filter((todo) => todo.status !== "done" && todo.due_date === today).length,
    doing: activeTodos.filter((todo) => todo.status === "doing").length,
    done,
    overdue: activeTodos.filter((todo) => todo.status !== "done" && todo.due_date !== null && todo.due_date < today)
      .length,
    completionRate: denominator === 0 ? 0 : Math.round((done / denominator) * 100),
  };
}

export function normalizeTodoStatusTransition(
  nextStatus: TodoStatus,
  previousStatus: TodoStatus,
  previousCompletedAt: string | null,
  now: string,
): { completed_at: string | null } {
  if (nextStatus === "done" && previousStatus !== "done") return { completed_at: now };
  if (nextStatus !== "done" && previousStatus === "done") return { completed_at: null };
  return { completed_at: previousCompletedAt };
}

export function todayDateString(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
