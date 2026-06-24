import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { crm_contacts, crm_events, crm_relationships, crm_event_participants } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { eq, inArray } from "drizzle-orm";

// 获取图谱数据（节点 + 边）
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const ledgerId = request.nextUrl.searchParams.get("ledger_id");

    if (!ledgerId) {
      return NextResponse.json({ success: false, error: "缺少 ledger_id 参数" }, { status: 400 });
    }

    const db = getDb();
    const lid = parseInt(ledgerId, 10);

    // 联系人是全局 CRM 数据；当前账本只决定事件与关系边的范围。
    const contacts = await db
      .select({ id: crm_contacts.id, name: crm_contacts.name, company: crm_contacts.company })
      .from(crm_contacts);

    // 获取所有事件/项目
    const events = await db
      .select({ id: crm_events.id, title: crm_events.title, type: crm_events.type })
      .from(crm_events)
      .where(eq(crm_events.ledger_id, lid));

    // 获取所有关联关系
    const relationships = await db
      .select()
      .from(crm_relationships)
      .where(eq(crm_relationships.ledger_id, lid));

    // 获取事件参与者关系
    let participantLinks: Array<{ source: string; target: string; label: string; color: string }> = [];

    if (events.length > 0) {
      const eventIds = events.map((e) => e.id);
      const participants = await db
        .select({ event_id: crm_event_participants.event_id, contact_id: crm_event_participants.contact_id, role: crm_event_participants.role })
        .from(crm_event_participants)
        .where(inArray(crm_event_participants.event_id, eventIds));

      participantLinks = participants.map((p) => ({
        source: `contact-${p.contact_id}`,
        target: `event-${p.event_id}`,
        label: p.role || "参与者",
        color: "#94a3b8",
      }));
    }

    // 构建节点
    const nodes = [
      ...contacts.map((c) => ({
        id: `contact-${c.id}`,
        type: "contact" as const,
        label: c.name,
        sublabel: c.company,
        color: "#b87333",
        borderColor: "#b87333",
      })),
      ...events.map((e) => ({
        id: `event-${e.id}`,
        type: e.type as "event" | "project",
        label: e.title,
        sublabel: e.type === "project" ? "项目" : "事件",
        color: e.type === "project" ? "#4a7c59" : "#d4a574",
        borderColor: e.type === "project" ? "#4a7c59" : "#d4a574",
      })),
    ];

    // 构建边
    const links = [
      ...relationships.map((r) => ({
        source: `${r.source_type}-${r.source_id}`,
        target: `${r.target_type}-${r.target_id}`,
        label: r.label,
        color: "#64748b",
      })),
      ...participantLinks,
    ];

    return NextResponse.json({ success: true, data: { nodes, links } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
