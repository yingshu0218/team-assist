import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { crm_relationships, crm_contacts, crm_events } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { eq, and, or, desc } from "drizzle-orm";

// 获取关联关系列表
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const ledgerId = request.nextUrl.searchParams.get("ledger_id");
    const entityType = request.nextUrl.searchParams.get("entity_type");
    const entityId = request.nextUrl.searchParams.get("entity_id");

    if (!ledgerId) {
      return NextResponse.json({ success: false, error: "缺少 ledger_id 参数" }, { status: 400 });
    }

    const db = getDb();
    const conditions = [eq(crm_relationships.ledger_id, parseInt(ledgerId, 10))];

    // 按实体过滤
    if (entityType && entityId) {
      const eid = parseInt(entityId, 10);
      conditions.push(
        or(
          and(eq(crm_relationships.source_type, entityType), eq(crm_relationships.source_id, eid)),
          and(eq(crm_relationships.target_type, entityType), eq(crm_relationships.target_id, eid))
        )!
      );
    }

    const data = await db
      .select()
      .from(crm_relationships)
      .where(and(...conditions))
      .orderBy(desc(crm_relationships.created_at));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 创建关联关系
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const body = await request.json();
    const { ledger_id, source_type, source_id, target_type, target_id, label } = body;

    if (!ledger_id || !source_type || !source_id || !target_type || !target_id) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数: ledger_id, source_type, source_id, target_type, target_id" },
        { status: 400 }
      );
    }

    if (!["contact", "event"].includes(source_type) || !["contact", "event"].includes(target_type)) {
      return NextResponse.json(
        { success: false, error: "实体类型必须为 contact 或 event" },
        { status: 400 }
      );
    }

    if (source_type === target_type && source_id === target_id) {
      return NextResponse.json(
        { success: false, error: "不能创建自身关联" },
        { status: 400 }
      );
    }

    const db = getDb();

    // 验证源实体存在
    const sourceTable = source_type === "contact" ? crm_contacts : crm_events;
    const srcRows = await db.select({ id: sourceTable.id }).from(sourceTable).where(eq(sourceTable.id, source_id)).limit(1);
    if (srcRows.length === 0) {
      return NextResponse.json(
        { success: false, error: `源${source_type === "contact" ? "联系人" : "事件"}不存在` },
        { status: 404 }
      );
    }

    // 验证目标实体存在
    const targetTable = target_type === "contact" ? crm_contacts : crm_events;
    const tgtRows = await db.select({ id: targetTable.id }).from(targetTable).where(eq(targetTable.id, target_id)).limit(1);
    if (tgtRows.length === 0) {
      return NextResponse.json(
        { success: false, error: `目标${target_type === "contact" ? "联系人" : "事件"}不存在` },
        { status: 404 }
      );
    }

    // 检查是否已存在相同关联
    const existing = await db
      .select({ id: crm_relationships.id })
      .from(crm_relationships)
      .where(
        and(
          eq(crm_relationships.ledger_id, ledger_id),
          eq(crm_relationships.source_type, source_type),
          eq(crm_relationships.source_id, source_id),
          eq(crm_relationships.target_type, target_type),
          eq(crm_relationships.target_id, target_id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: "该关联关系已存在" }, { status: 409 });
    }

    const result = await db
      .insert(crm_relationships)
      .values({
        ledger_id,
        source_type,
        source_id,
        target_type,
        target_id,
        label: label?.trim() || null,
      })
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
