import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { tags } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { asc, eq } from "drizzle-orm";

// 获取标签列表
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const url = new URL(request.url);
    const ledger_id = url.searchParams.get("ledger_id");

    if (!ledger_id) {
      return NextResponse.json({ success: false, error: "缺少 ledger_id" }, { status: 400 });
    }

    const db = getDb();
    const data = await db
      .select()
      .from(tags)
      .where(eq(tags.ledger_id, parseInt(ledger_id, 10)))
      .orderBy(asc(tags.name));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 创建标签
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const body = await request.json();
    const { ledger_id, name, color } = body;

    if (!ledger_id || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: "缺少必要字段 (ledger_id, name)" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = await db
      .insert(tags)
      .values({
        ledger_id: parseInt(ledger_id, 10),
        name: name.trim(),
        color: color || null,
      })
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
