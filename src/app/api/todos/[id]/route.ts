import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import {
  computeChecklistProgress,
  isTodoPriority,
  isTodoStatus,
  normalizeDateOnly,
  normalizeOptionalId,
  normalizeTodoStatusTransition,
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

type TodoUpdate = Partial<typeof todos.$inferInsert> & { updated_at: string };

function parseId(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeText(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function normalizeTitleUpdate(value: unknown): string | null {
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

function normalizeStatus(value: unknown): TodoStatus {
  if (isTodoStatus(value)) return value;
  throw new Error("无效待办状态");
}

function normalizePriority(value: unknown): TodoPriority {
  if (isTodoPriority(value)) return value;
  throw new Error("无效优先级");
}

function toChecklistItems(rows: (typeof todo_checklist_items.$inferSelect)[]): TodoChecklistItem[] {
  return rows;
}

function validStoredStatus(value: string): TodoStatus {
  return isTodoStatus(value) ? value : "todo";
}

async function findTodo(id: number) {
  const db = getDb();
  const result = await db.select().from(todos).where(eq(todos.id, id)).limit(1);
  return result[0] ?? null;
}

async function getTodoDetail(id: number) {
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
    .where(eq(todos.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const checklist = toChecklistItems(
    await db
      .select()
      .from(todo_checklist_items)
      .where(eq(todo_checklist_items.todo_id, id))
      .orderBy(asc(todo_checklist_items.sort_order), asc(todo_checklist_items.created_at)),
  );

  return {
    ...row.todo,
    team: row.team?.id ? row.team : null,
    ledger: row.ledger?.id ? row.ledger : null,
    checklist,
    checklistProgress: computeChecklistProgress(checklist, validStoredStatus(row.todo.status)),
  };
}

// 获取待办详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ success: false, error: "无效待办 ID" }, { status: 400 });
    }

    const todo = await getTodoDetail(id);
    if (!todo) {
      return NextResponse.json({ success: false, error: "待办不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: todo });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 更新待办
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ success: false, error: "无效待办 ID" }, { status: 400 });
    }

    const existing = await findTodo(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "待办不存在" }, { status: 404 });
    }

    const body = (await request.json()) as TodoPayload;
    const updates: TodoUpdate = { updated_at: new Date().toISOString() };

    if (body.title !== undefined) {
      const title = normalizeTitleUpdate(body.title);
      if (!title) {
        return NextResponse.json({ success: false, error: "待办标题不能为空" }, { status: 400 });
      }
      updates.title = title;
    }
    if (body.notes !== undefined) updates.notes = normalizeText(body.notes);
    if (body.priority !== undefined) updates.priority = normalizePriority(body.priority);
    if (body.due_date !== undefined) updates.due_date = normalizeDateOnly(body.due_date) ?? null;
    if (body.team_id !== undefined) updates.team_id = normalizeOptionalId(body.team_id) ?? null;
    if (body.ledger_id !== undefined) updates.ledger_id = normalizeOptionalId(body.ledger_id) ?? null;
    if (body.sort_order !== undefined) updates.sort_order = normalizeSortOrder(body.sort_order);
    if (body.status !== undefined) {
      const status = normalizeStatus(body.status);
      updates.status = status;
      updates.completed_at = normalizeTodoStatusTransition(
        status,
        validStoredStatus(existing.status),
        existing.completed_at,
        updates.updated_at,
      ).completed_at;
    }

    const db = getDb();
    const result = await db.update(todos).set(updates).where(eq(todos.id, id)).returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

// 删除待办
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ success: false, error: "无效待办 ID" }, { status: 400 });
    }

    const existing = await findTodo(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "待办不存在" }, { status: 404 });
    }

    const db = getDb();
    await db.delete(todos).where(eq(todos.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
