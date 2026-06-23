import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { crm_events, crm_event_participants, crm_contacts } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { eq } from "drizzle-orm";

// 获取/更新/删除事件
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id } = await params;
    const db = getDb();
    const eventId = parseInt(id, 10);

    const events = await db
      .select()
      .from(crm_events)
      .where(eq(crm_events.id, eventId))
      .limit(1);

    const event = events[0];
    if (!event) {
      return NextResponse.json({ success: false, error: "事件不存在" }, { status: 404 });
    }

    // 获取参与者（含联系人信息）
    const participants = await db
      .select({
        id: crm_event_participants.id,
        event_id: crm_event_participants.event_id,
        contact_id: crm_event_participants.contact_id,
        role: crm_event_participants.role,
        created_at: crm_event_participants.created_at,
        contact_name: crm_contacts.name,
        contact_phone: crm_contacts.phone,
        contact_company: crm_contacts.company,
      })
      .from(crm_event_participants)
      .leftJoin(crm_contacts, eq(crm_event_participants.contact_id, crm_contacts.id))
      .where(eq(crm_event_participants.event_id, eventId));

    const formatted = participants.map((p) => ({
      id: p.id,
      event_id: p.event_id,
      contact_id: p.contact_id,
      role: p.role,
      created_at: p.created_at,
      crm_contacts: p.contact_name
        ? { id: p.contact_id, name: p.contact_name, phone: p.contact_phone, company: p.contact_company }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: { ...event, participants: formatted },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 更新事件
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, type } = body;

    const db = getDb();
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (type !== undefined) updateData.type = type;

    const result = await db
      .update(crm_events)
      .set(updateData)
      .where(eq(crm_events.id, parseInt(id, 10)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "事件不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 删除事件
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id } = await params;
    const db = getDb();
    await db.delete(crm_events).where(eq(crm_events.id, parseInt(id, 10)));

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
