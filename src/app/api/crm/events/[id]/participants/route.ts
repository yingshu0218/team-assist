import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { crm_event_participants, crm_events, crm_contacts } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// 添加/移除事件参与者
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const { contact_id, role } = body;

    if (!contact_id) {
      return NextResponse.json({ success: false, error: "缺少 contact_id 参数" }, { status: 400 });
    }

    const db = getDb();
    const eventId = parseInt(id, 10);
    const contactId = parseInt(contact_id, 10);

    // 验证事件存在
    const evts = await db.select({ id: crm_events.id }).from(crm_events).where(eq(crm_events.id, eventId)).limit(1);
    if (evts.length === 0) {
      return NextResponse.json({ success: false, error: "事件不存在" }, { status: 404 });
    }

    // 验证联系人存在
    const cts = await db.select({ id: crm_contacts.id }).from(crm_contacts).where(eq(crm_contacts.id, contactId)).limit(1);
    if (cts.length === 0) {
      return NextResponse.json({ success: false, error: "联系人不存在" }, { status: 404 });
    }

    // 检查是否已存在
    const existing = await db
      .select({ id: crm_event_participants.id })
      .from(crm_event_participants)
      .where(and(eq(crm_event_participants.event_id, eventId), eq(crm_event_participants.contact_id, contactId)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: "该联系人已是参与者" }, { status: 409 });
    }

    const result = await db
      .insert(crm_event_participants)
      .values({
        event_id: eventId,
        contact_id: contactId,
        role: role?.trim() || null,
      })
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 移除参与者
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const { contact_id } = body;

    if (!contact_id) {
      return NextResponse.json({ success: false, error: "缺少 contact_id 参数" }, { status: 400 });
    }

    const db = getDb();
    await db
      .delete(crm_event_participants)
      .where(
        and(
          eq(crm_event_participants.event_id, parseInt(id, 10)),
          eq(crm_event_participants.contact_id, parseInt(contact_id, 10))
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
