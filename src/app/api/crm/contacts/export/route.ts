import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { crm_contacts, crm_groups, crm_group_members, crm_contact_logs } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { asc } from "drizzle-orm";

// CRM 联系人导出：CSV / JSON 格式
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const sp = request.nextUrl.searchParams;
    const format = sp.get("format") || "csv";

    const db = getDb();

    // 查询联系人
    const contacts = await db
      .select()
      .from(crm_contacts)
      .orderBy(asc(crm_contacts.name));

    // 查询分组及其成员
    const groups = await db.select().from(crm_groups);
    const memberships = await db.select().from(crm_group_members);

    // 构建 contact -> groups 映射
    const contactGroupsMap = new Map<number, string[]>();
    for (const m of memberships) {
      const group = groups.find((g) => g.id === m.group_id);
      if (group) {
        const existing = contactGroupsMap.get(m.contact_id) || [];
        existing.push(group.name);
        contactGroupsMap.set(m.contact_id, existing);
      }
    }

    // 查询联系记录数量
    const logs = await db.select({ contact_id: crm_contact_logs.contact_id }).from(crm_contact_logs);

    const contactLogCountMap = new Map<number, number>();
    for (const log of logs) {
      contactLogCountMap.set(log.contact_id, (contactLogCountMap.get(log.contact_id) || 0) + 1);
    }

    if (format === "json") {
      const exportData = {
        version: 1,
        exported_at: new Date().toISOString(),
        type: "crm_contacts",
        contacts: contacts.map((c) => ({
          ...c,
          groups: contactGroupsMap.get(c.id) || [],
          log_count: contactLogCountMap.get(c.id) || 0,
        })),
      };

      const filename = `CRM联系人_导出.json`;
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    }

    // CSV 格式
    const BOM = "\uFEFF";
    const header = "姓名,电话,单位,备注,所属分组,联系记录数\n";
    const rows = contacts.map((c) => {
      const groupNames = (contactGroupsMap.get(c.id) || []).join("|");
      const logCount = contactLogCountMap.get(c.id) || 0;
      return [
        (c.name || "").replace(/"/g, '""'),
        (c.phone || "").replace(/"/g, '""'),
        (c.company || "").replace(/"/g, '""'),
        (c.notes || "").replace(/"/g, '""'),
        groupNames,
        String(logCount),
      ].map((v) => `"${v}"`).join(",");
    }).join("\n");

    const csv = BOM + header + rows;
    const filename = `CRM联系人_导出.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "导出失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
