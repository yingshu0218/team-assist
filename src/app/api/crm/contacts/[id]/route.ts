import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import {
  crm_contacts, crm_contact_logs, crm_groups, crm_group_members,
  crm_events, crm_event_participants, crm_relationships,
} from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { eq, and, desc, sql } from "drizzle-orm";

// 获取联系人详情（聚合 logs/groups/events/relationships）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id } = await params;
    const contactId = parseInt(id, 10);
    const db = getDb();

    const contactRows = await db
      .select()
      .from(crm_contacts)
      .where(eq(crm_contacts.id, contactId))
      .limit(1);

    if (!contactRows[0]) {
      return NextResponse.json({ success: false, error: "联系人不存在" }, { status: 404 });
    }

    const contact = contactRows[0];

    // 联系记录
    const logs = await db
      .select()
      .from(crm_contact_logs)
      .where(eq(crm_contact_logs.contact_id, contactId))
      .orderBy(desc(crm_contact_logs.log_date));

    // 所在分组
    const groupMemberRows = await db
      .select({ group_id: crm_group_members.group_id })
      .from(crm_group_members)
      .where(eq(crm_group_members.contact_id, contactId));

    const groupIds = groupMemberRows.map((m) => m.group_id).filter((gid): gid is number => gid !== null);
    let groups: typeof crm_groups.$inferSelect[] = [];
    if (groupIds.length > 0) {
      groups = await db
        .select()
        .from(crm_groups)
        .where(sql`${crm_groups.id} IN (${sql.join(groupIds.map((gid) => sql`${gid}`), sql`, `)})`);
    }

    // 参与的事件
    const eventParticipantRows = await db
      .select({ event_id: crm_event_participants.event_id, role: crm_event_participants.role })
      .from(crm_event_participants)
      .where(eq(crm_event_participants.contact_id, contactId));

    const eventIds = eventParticipantRows.map((p) => p.event_id).filter((eid): eid is number => eid !== null);
    let events: (typeof crm_events.$inferSelect & { role: string | null })[] = [];
    if (eventIds.length > 0) {
      const eventRows = await db
        .select()
        .from(crm_events)
        .where(sql`${crm_events.id} IN (${sql.join(eventIds.map((eid) => sql`${eid}`), sql`, `)})`);
      events = eventRows.map((e) => ({
        ...e,
        role: eventParticipantRows.find((p) => p.event_id === e.id)?.role || null,
      }));
    }

    // 关联关系（作为 source 或 target）
    const rels = await db
      .select()
      .from(crm_relationships)
      .where(
        sql`(${crm_relationships.source_type} = 'contact' AND ${crm_relationships.source_id} = ${contactId})
             OR (${crm_relationships.target_type} = 'contact' AND ${crm_relationships.target_id} = ${contactId})`
      );

    return NextResponse.json({
      success: true,
      data: {
        ...contact,
        logs,
        groups,
        events,
        relationships: rels,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 更新联系人
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
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
    if (body.company !== undefined) updates.company = body.company?.trim() || null;
    if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;

    const db = getDb();
    const result = await db
      .update(crm_contacts)
      .set(updates)
      .where(eq(crm_contacts.id, parseInt(id, 10)))
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 删除联系人（级联由 SQLite ON DELETE CASCADE 处理）
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
      .delete(crm_contacts)
      .where(eq(crm_contacts.id, parseInt(id, 10)));

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
