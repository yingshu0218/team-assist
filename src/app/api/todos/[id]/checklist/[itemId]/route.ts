import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { getDb } from "@/storage/database/sqlite-client";
import { todo_checklist_items } from "@/storage/database/shared/schema";

type ChecklistItemPayload = {
  title?: unknown;
  is_done?: unknown;
  sort_order?: unknown;
};

type ChecklistUpdate = Partial<typeof todo_checklist_items.$inferInsert> & { updated_at: string };

function parseId(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeTitle(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  throw new Error("完成状态必须是布尔值");
}

function normalizeSortOrder(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return 0;
}

async function findItem(todoId: number, itemId: number) {
  const db = getDb();
  const result = await db
    .select()
    .from(todo_checklist_items)
    .where(eq(todo_checklist_items.id, itemId))
    .limit(1);
  const item = result[0] ?? null;
  if (!item || item.todo_id !== todoId) return null;
  return item;
}

// 更新清单项
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id: rawId, itemId: rawItemId } = await params;
    const id = parseId(rawId);
    const itemId = parseId(rawItemId);
    if (!id || !itemId) {
      return NextResponse.json({ success: false, error: "无效清单项 ID" }, { status: 400 });
    }

    const existing = await findItem(id, itemId);
    if (!existing) {
      return NextResponse.json({ success: false, error: "清单项不存在" }, { status: 404 });
    }

    const body = (await request.json()) as ChecklistItemPayload;
    const updates: ChecklistUpdate = { updated_at: new Date().toISOString() };

    if (body.title !== undefined) {
      const title = normalizeTitle(body.title);
      if (!title) {
        return NextResponse.json({ success: false, error: "清单项标题不能为空" }, { status: 400 });
      }
      updates.title = title;
    }
    if (body.is_done !== undefined) updates.is_done = normalizeBoolean(body.is_done);
    if (body.sort_order !== undefined) updates.sort_order = normalizeSortOrder(body.sort_order);

    const db = getDb();
    const result = await db
      .update(todo_checklist_items)
      .set(updates)
      .where(eq(todo_checklist_items.id, itemId))
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

// 删除清单项
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id: rawId, itemId: rawItemId } = await params;
    const id = parseId(rawId);
    const itemId = parseId(rawItemId);
    if (!id || !itemId) {
      return NextResponse.json({ success: false, error: "无效清单项 ID" }, { status: 400 });
    }

    const existing = await findItem(id, itemId);
    if (!existing) {
      return NextResponse.json({ success: false, error: "清单项不存在" }, { status: 404 });
    }

    const db = getDb();
    await db.delete(todo_checklist_items).where(eq(todo_checklist_items.id, itemId));

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
