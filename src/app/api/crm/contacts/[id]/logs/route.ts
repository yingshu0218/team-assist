import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { getDb } from "@/storage/database/sqlite-client";
import { crm_contact_logs, crm_contacts } from "@/storage/database/shared/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id } = await params;
    const contactId = parseInt(id, 10);
    const db = getDb();
    const data = await db
      .select()
      .from(crm_contact_logs)
      .where(eq(crm_contact_logs.contact_id, contactId))
      .orderBy(desc(crm_contact_logs.log_date));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取联系记录失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id } = await params;
    const contactId = parseInt(id, 10);
    const body = await request.json() as { content?: string; log_date?: string };
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ success: false, error: "联系记录内容不能为空" }, { status: 400 });
    }

    const db = getDb();
    const contact = await db
      .select({ id: crm_contacts.id })
      .from(crm_contacts)
      .where(eq(crm_contacts.id, contactId))
      .limit(1);
    if (!contact[0]) {
      return NextResponse.json({ success: false, error: "联系人不存在" }, { status: 404 });
    }

    const result = await db
      .insert(crm_contact_logs)
      .values({ contact_id: contactId, content, log_date: body.log_date || new Date().toISOString() })
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "添加联系记录失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
