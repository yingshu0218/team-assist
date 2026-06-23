import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { crm_events, crm_event_participants } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { asc, eq, like, and, desc, sql } from "drizzle-orm";

// 获取事件/项目列表（含参与者计数）
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const ledgerId = request.nextUrl.searchParams.get("ledger_id");
    const type = request.nextUrl.searchParams.get("type");
    const search = request.nextUrl.searchParams.get("search");

    if (!ledgerId) {
      return NextResponse.json({ success: false, error: "缺少 ledger_id 参数" }, { status: 400 });
    }

    const db = getDb();
    const conditions = [eq(crm_events.ledger_id, parseInt(ledgerId, 10))];
    if (type) conditions.push(eq(crm_events.type, type as "event" | "project"));
    if (search?.trim()) conditions.push(like(crm_events.title, `%${search.trim()}%`));

    const events = await db
      .select()
      .from(crm_events)
      .where(and(...conditions))
      .orderBy(desc(crm_events.created_at));

    // 获取每个事件的参与者计数
    const participantCounts = await db
      .select({
        event_id: crm_event_participants.event_id,
        count: sql<number>`count(*)`,
      })
      .from(crm_event_participants)
      .groupBy(crm_event_participants.event_id);

    const countMap = new Map(participantCounts.map((p) => [p.event_id, p.count]));

    const results = events.map((e) => ({
      ...e,
      participantCount: countMap.get(e.id) ?? 0,
    }));

    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 创建事件/项目
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const body = await request.json();
    const { ledger_id, title, type } = body;

    if (!ledger_id || !title?.trim() || !type) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数: ledger_id, title, type" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = await db
      .insert(crm_events)
      .values({
        ledger_id: parseInt(ledger_id, 10),
        title: title.trim(),
        type,
      })
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
