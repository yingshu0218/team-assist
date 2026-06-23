import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { category_groups } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { asc, eq } from "drizzle-orm";

// 获取分类分组列表
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const url = new URL(request.url);
    const ledger_id = url.searchParams.get("ledger_id");
    const type = url.searchParams.get("type");

    if (!ledger_id) {
      return NextResponse.json({ success: false, error: "缺少 ledger_id" }, { status: 400 });
    }

    const db = getDb();
    const conditions = [eq(category_groups.ledger_id, parseInt(ledger_id, 10))];
    if (type) conditions.push(eq(category_groups.type, type as "income" | "expense"));

    const data = await db
      .select()
      .from(category_groups)
      .where(
        conditions.length === 2
          ? (await import("drizzle-orm")).and(...conditions)
          : conditions[0]
      )
      .orderBy(asc(category_groups.sort_order), asc(category_groups.id));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 创建分类分组
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const body = await request.json();
    const { ledger_id, name, type, icon, sort_order } = body;

    if (!ledger_id || !name?.trim() || !type) {
      return NextResponse.json(
        { success: false, error: "缺少必要字段 (ledger_id, name, type)" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = await db
      .insert(category_groups)
      .values({
        ledger_id: parseInt(ledger_id, 10),
        name: name.trim(),
        type,
        icon: icon || null,
        sort_order: sort_order ?? 0,
      })
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
