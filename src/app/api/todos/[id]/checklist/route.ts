import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { getDb } from "@/storage/database/sqlite-client";
import { todo_checklist_items, todos } from "@/storage/database/shared/schema";

type ChecklistPayload = {
  title?: unknown;
  sort_order?: unknown;
};

type ChecklistInsert = typeof todo_checklist_items.$inferInsert;

function parseId(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeTitle(value: unknown): string | null {
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

async function todoExists(id: number): Promise<boolean> {
  const db = getDb();
  const result = await db.select({ id: todos.id }).from(todos).where(eq(todos.id, id)).limit(1);
  return result.length > 0;
}

// 获取待办清单
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

    if (!(await todoExists(id))) {
      return NextResponse.json({ success: false, error: "待办不存在" }, { status: 404 });
    }

    const db = getDb();
    const data = await db
      .select()
      .from(todo_checklist_items)
      .where(eq(todo_checklist_items.todo_id, id))
      .orderBy(asc(todo_checklist_items.sort_order), asc(todo_checklist_items.created_at));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 创建待办清单项
export async function POST(
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

    if (!(await todoExists(id))) {
      return NextResponse.json({ success: false, error: "待办不存在" }, { status: 404 });
    }

    const body = (await request.json()) as ChecklistPayload;
    const title = normalizeTitle(body.title);
    if (!title) {
      return NextResponse.json({ success: false, error: "清单项标题不能为空" }, { status: 400 });
    }

    const values: ChecklistInsert = {
      todo_id: id,
      title,
      sort_order: body.sort_order === undefined ? 0 : normalizeSortOrder(body.sort_order),
    };

    const db = getDb();
    const result = await db.insert(todo_checklist_items).values(values).returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
