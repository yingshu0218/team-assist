import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { crm_groups, crm_group_members } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { asc, eq, sql } from "drizzle-orm";

// 获取分组列表（含成员计数）
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const ledgerId = request.nextUrl.searchParams.get("ledger_id");

    if (!ledgerId) {
      return NextResponse.json({ success: false, error: "缺少 ledger_id 参数" }, { status: 400 });
    }

    const db = getDb();
    const groups = await db
      .select()
      .from(crm_groups)
      .where(eq(crm_groups.ledger_id, parseInt(ledgerId, 10)))
      .orderBy(asc(crm_groups.created_at));

    // 获取每个分组的成员计数
    const memberCounts = await db
      .select({
        group_id: crm_group_members.group_id,
        count: sql<number>`count(*)`,
      })
      .from(crm_group_members)
      .groupBy(crm_group_members.group_id);

    const countMap = new Map(memberCounts.map((m) => [m.group_id, m.count]));

    const results = groups.map((g) => ({
      ...g,
      memberCount: countMap.get(g.id) ?? 0,
    }));

    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 创建分组
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const body = await request.json();
    const { ledger_id, name, color, description } = body;

    if (!ledger_id || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数: ledger_id, name" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = await db
      .insert(crm_groups)
      .values({
        ledger_id: parseInt(ledger_id, 10),
        name: name.trim(),
        color: color || null,
        description: description?.trim() || null,
      })
      .returning();

    return NextResponse.json({ success: true, data: { ...result[0], memberCount: 0 } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
