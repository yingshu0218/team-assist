import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { transactions } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { eq } from "drizzle-orm";

// 更新交易记录
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.amount !== undefined) updates.amount = String(body.amount);
    if (body.type !== undefined) updates.type = body.type;
    if (body.category_id !== undefined) updates.category_id = body.category_id ? parseInt(body.category_id, 10) : null;
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.transaction_date !== undefined) updates.transaction_date = body.transaction_date;
    if (body.tag_ids !== undefined) updates.tag_ids = body.tag_ids ? JSON.stringify(body.tag_ids) : null;

    const db = getDb();
    const result = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, parseInt(id, 10)))
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 删除交易记录
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
      .delete(transactions)
      .where(eq(transactions.id, parseInt(id, 10)));

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
