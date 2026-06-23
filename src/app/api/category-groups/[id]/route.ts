import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { category_groups } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { eq } from "drizzle-orm";

// 更新分类分组
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

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

    const db = getDb();
    const result = await db
      .update(category_groups)
      .set(updates)
      .where(eq(category_groups.id, parseInt(id, 10)))
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 删除分类分组（分类的 group_id 自动 SET NULL — schema 中定义了）
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
      .delete(category_groups)
      .where(eq(category_groups.id, parseInt(id, 10)));

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
