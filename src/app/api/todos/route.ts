import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, inArray, isNull, like, lt, ne, SQL } from "drizzle-orm";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import {
  computeChecklistProgress,
  isTodoPriority,
  isTodoStatus,
  normalizeDateOnly,
  normalizeOptionalId,
  normalizeTodoStatusTransition,
  todayDateString,
} from "@/lib/todos";
import type { TodoChecklistItem, TodoPriority, TodoStatus } from "@/lib/types";
import { getDb } from "@/storage/database/sqlite-client";
import { ledgers, teams, todo_checklist_items, todos } from "@/storage/database/shared/schema";

type TodoPayload = {
  title?: unknown;
  notes?: unknown;
  status?: unknown;
  priority?: unknown;
  due_date?: unknown;
  team_id?: unknown;
  ledger_id?: unknown;
  sort_order?: unknown;
};

type TodoInsert = typeof todos.$inferInsert;

function normalizeText(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function normalizeRequiredTitle(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function normalizeSortOrder(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return 0;
}

function normalizeStatus(value: unknown, fallback: TodoStatus): TodoStatus {
  if (value === undefined || value === null || value === "") return fallback;
  if (isTodoStatus(value)) return value;
  throw new Error("无效待办状态");
}

function normalizePriority(value: unknown, fallback: TodoPriority): TodoPriority {
  if (value === undefined || value === null || value === "") return fallback;
  if (isTodoPriority(value)) return value;
  throw new Error("无效优先级");
}

function toChecklistItems(rows: (typeof todo_checklist_items.$inferSelect)[]): TodoChecklistItem[] {
  return rows;
}

function validStoredStatus(value: string): TodoStatus {
  return isTodoStatus(value) ? value : "todo";
}

function parseQueryOptionalId(value: string | null, fieldName: string): number | null | undefined {
  if (value === null || value === "") return undefined;
  if (value === "none") return null;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`${fieldName} 必须是正整数或 none`);
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id)) {
    throw new Error(`${fieldName} 必须是正整数或 none`);
  }
  return id;
}

// 获取待办列表
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const searchParams = request.nextUrl.searchParams;
    const conditions: SQL[] = [];
    const teamId = searchParams.get("team_id");
    const ledgerId = searchParams.get("ledger_id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const due = searchParams.get("due");

    const parsedTeamId = parseQueryOptionalId(teamId, "team_id");
    const parsedLedgerId = parseQueryOptionalId(ledgerId, "ledger_id");

    if (parsedTeamId === null) {
      conditions.push(isNull(todos.team_id));
    } else if (parsedTeamId !== undefined) {
      conditions.push(eq(todos.team_id, parsedTeamId));
    }

    if (parsedLedgerId === null) {
      conditions.push(isNull(todos.ledger_id));
    } else if (parsedLedgerId !== undefined) {
      conditions.push(eq(todos.ledger_id, parsedLedgerId));
    }

    if (status && isTodoStatus(status)) {
      conditions.push(eq(todos.status, status));
    }

    const trimmedSearch = search?.trim();
    if (trimmedSearch) {
      conditions.push(like(todos.title, `%${trimmedSearch}%`));
    }

    const today = todayDateString();
    if (due === "none") {
      conditions.push(isNull(todos.due_date));
    } else if (due === "today") {
      conditions.push(eq(todos.due_date, today));
      conditions.push(ne(todos.status, "done"));
      conditions.push(ne(todos.status, "canceled"));
    } else if (due === "overdue") {
      conditions.push(lt(todos.due_date, today));
      conditions.push(ne(todos.status, "done"));
      conditions.push(ne(todos.status, "canceled"));
    }

    const db = getDb();
    const rows = await db
      .select({
        todo: todos,
        team: {
          id: teams.id,
          name: teams.name,
          color: teams.color,
        },
        ledger: {
          id: ledgers.id,
          name: ledgers.name,
          currency: ledgers.currency,
        },
      })
      .from(todos)
      .leftJoin(teams, eq(todos.team_id, teams.id))
      .leftJoin(ledgers, eq(todos.ledger_id, ledgers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(todos.sort_order), desc(todos.created_at));

    const todoIds = rows.map((row) => row.todo.id);
    const checklistRows =
      todoIds.length === 0
        ? []
        : await db
            .select()
            .from(todo_checklist_items)
            .where(inArray(todo_checklist_items.todo_id, todoIds))
            .orderBy(asc(todo_checklist_items.sort_order), asc(todo_checklist_items.created_at));

    const checklistByTodoId = new Map<number, TodoChecklistItem[]>();
    for (const item of toChecklistItems(checklistRows)) {
      const current = checklistByTodoId.get(item.todo_id) ?? [];
      current.push(item);
      checklistByTodoId.set(item.todo_id, current);
    }

    const data = rows.map((row) => {
      const checklist = checklistByTodoId.get(row.todo.id) ?? [];
      return {
        ...row.todo,
        team: row.team?.id ? row.team : null,
        ledger: row.ledger?.id ? row.ledger : null,
        checklistProgress: computeChecklistProgress(checklist, validStoredStatus(row.todo.status)),
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    const statusCode = msg.includes("必须是正整数或 none") ? 400 : 500;
    return NextResponse.json({ success: false, error: msg }, { status: statusCode });
  }
}

// 创建待办
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const body = (await request.json()) as TodoPayload;
    const title = normalizeRequiredTitle(body.title);
    if (!title) {
      return NextResponse.json({ success: false, error: "待办标题不能为空" }, { status: 400 });
    }

    const status = normalizeStatus(body.status, "todo");
    const now = new Date().toISOString();
    const transition = normalizeTodoStatusTransition(status, "todo", null, now);
    const values: TodoInsert = {
      title,
      notes: normalizeText(body.notes),
      status,
      priority: normalizePriority(body.priority, "medium"),
      due_date: normalizeDateOnly(body.due_date) ?? null,
      team_id: normalizeOptionalId(body.team_id) ?? null,
      ledger_id: normalizeOptionalId(body.ledger_id) ?? null,
      sort_order: body.sort_order === undefined ? 0 : normalizeSortOrder(body.sort_order),
      completed_at: transition.completed_at,
    };

    const db = getDb();
    const result = await db.insert(todos).values(values).returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
