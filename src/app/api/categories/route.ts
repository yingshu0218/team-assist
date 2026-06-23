import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { categories } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { asc, eq } from "drizzle-orm";

// 获取分类列表
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const url = new URL(request.url);
    const ledger_id = url.searchParams.get("ledger_id");
    const type = url.searchParams.get("type");
    const group_id = url.searchParams.get("group_id");

    if (!ledger_id) {
      return NextResponse.json({ success: false, error: "缺少 ledger_id" }, { status: 400 });
    }

    const db = getDb();
    const conditions = [eq(categories.ledger_id, parseInt(ledger_id, 10))];
    if (type) conditions.push(eq(categories.type, type as "income" | "expense"));
    if (group_id) conditions.push(eq(categories.group_id, parseInt(group_id, 10)));

    const { and } = await import("drizzle-orm");
    const data = await db
      .select()
      .from(categories)
      .where(and(...conditions))
      .orderBy(asc(categories.sort_order), asc(categories.id));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 创建分类
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const body = await request.json();
    const { ledger_id, name, type, group_id, icon, color, sort_order } = body;

    if (!ledger_id || !name?.trim() || !type) {
      return NextResponse.json(
        { success: false, error: "缺少必要字段 (ledger_id, name, type)" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = await db
      .insert(categories)
      .values({
        ledger_id: parseInt(ledger_id, 10),
        group_id: group_id ? parseInt(group_id, 10) : null,
        name: name.trim(),
        type,
        icon: icon || null,
        color: color || null,
        sort_order: sort_order ?? 0,
      })
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
