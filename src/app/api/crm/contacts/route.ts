import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { crm_contacts } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { asc, eq, like, and, sql } from "drizzle-orm";
import { parseContactRegions, serializeContactRegions } from "@/lib/contact-regions";

// 获取联系人列表
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const group_id = url.searchParams.get("group_id");

    const db = getDb();

    if (group_id) {
      // 按分组筛选：先查成员表获取 contact_id 列表
      const { crm_group_members } = await import("@/storage/database/shared/schema");
      const memberRows = await db
        .select({ contact_id: crm_group_members.contact_id })
        .from(crm_group_members)
        .where(eq(crm_group_members.group_id, parseInt(group_id, 10)));

      if (memberRows.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      const contactIds = memberRows.map((m) => m.contact_id).filter((id): id is number => id !== null);
      const conditions = [
        sql`${crm_contacts.id} IN (${contactIds.join(",")})`,
      ];
      if (search) conditions.push(like(crm_contacts.name, `%${search}%`));

      const data = await db
        .select()
        .from(crm_contacts)
        .where(and(...conditions))
        .orderBy(asc(crm_contacts.name));

      return NextResponse.json({ success: true, data: data.map((contact) => ({ ...contact, region: parseContactRegions(contact.region) })) });
    }

    const data = await db
      .select()
      .from(crm_contacts)
      .where(search
        ? sql`(${crm_contacts.name} LIKE ${`%${search}%`} OR ${crm_contacts.company} LIKE ${`%${search}%`} OR ${crm_contacts.phone} LIKE ${`%${search}%`})`
        : undefined)
      .orderBy(asc(crm_contacts.name));

    return NextResponse.json({ success: true, data: data.map((contact) => ({ ...contact, region: parseContactRegions(contact.region) })) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 创建联系人
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const body = await request.json();
    const { name, phone, company, region, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数: name" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = await db
      .insert(crm_contacts)
      .values({
        name: name.trim(),
        phone: phone?.trim() || null,
        company: company?.trim() || null,
        region: serializeContactRegions(region),
        notes: notes?.trim() || null,
      })
      .returning();

    return NextResponse.json({ success: true, data: result[0] ? { ...result[0], region: parseContactRegions(result[0].region) } : null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
