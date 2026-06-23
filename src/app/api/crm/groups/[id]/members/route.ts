import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { crm_group_members } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// 添加分组成员
export async function POST(
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
      return NextResponse.json(
        { success: false, error: "缺少 contact_id 参数" },
        { status: 400 }
      );
    }

    const db = getDb();
    const groupId = parseInt(id, 10);
    const contactId = parseInt(contact_id, 10);

    // 检查是否已存在
    const existing = await db
      .select({ id: crm_group_members.id })
      .from(crm_group_members)
      .where(
        and(
          eq(crm_group_members.group_id, groupId),
          eq(crm_group_members.contact_id, contactId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "该联系人已在此分组中" },
        { status: 409 }
      );
    }

    const result = await db
      .insert(crm_group_members)
      .values({
        group_id: groupId,
        contact_id: contactId,
      })
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 移除分组成员
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
      return NextResponse.json(
        { success: false, error: "缺少 contact_id 参数" },
        { status: 400 }
      );
    }

    const db = getDb();
    await db
      .delete(crm_group_members)
      .where(
        and(
          eq(crm_group_members.group_id, parseInt(id, 10)),
          eq(crm_group_members.contact_id, parseInt(contact_id, 10))
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
