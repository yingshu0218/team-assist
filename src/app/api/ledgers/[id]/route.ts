import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { ledgers, teams } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { normalizeOptionalId } from "@/lib/todos";
import { eq } from "drizzle-orm";

// 获取单个账本
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id } = await params;
    const db = getDb();
    const result = await db
      .select()
      .from(ledgers)
      .where(eq(ledgers.id, parseInt(id, 10)))
      .limit(1);

    if (!result[0]) {
      return NextResponse.json({ success: false, error: "账本不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 更新账本
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.currency !== undefined) updates.currency = body.currency;
    if (body.initial_balance !== undefined) updates.initial_balance = String(body.initial_balance);
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    const db = getDb();

    if (body.team_id !== undefined) {
      try {
        updates.team_id = normalizeOptionalId(body.team_id) ?? null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "ID 必须是正整数或 none";
        return NextResponse.json({ success: false, error: msg }, { status: 400 });
      }

      if (typeof updates.team_id === "number") {
        const teamResult = await db
          .select({ id: teams.id })
          .from(teams)
          .where(eq(teams.id, updates.team_id))
          .limit(1);

        if (!teamResult[0]) {
          return NextResponse.json({ success: false, error: "团队不存在" }, { status: 400 });
        }
      }
    }

    const result = await db
      .update(ledgers)
      .set(updates)
      .where(eq(ledgers.id, parseInt(id, 10)))
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 删除账本（级联删除关联数据 — SQLite foreign keys ON CASCADE）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id } = await params;
    const db = getDb();
    await db
      .delete(ledgers)
      .where(eq(ledgers.id, parseInt(id, 10)));

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
