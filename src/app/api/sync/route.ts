import { NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import {
  ledgers, category_groups, categories, tags, transactions,
  crm_contacts, crm_contact_logs, crm_groups, crm_group_members,
  crm_events, crm_event_participants, crm_relationships,
} from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { asc, sql as drizzleSql } from "drizzle-orm";

// 导出所有数据为 JSON（用于本地备份或 Git 推送）
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();
  try {
    const db = getDb();

    const [
      ledgersData, categoryGroupsData, categoriesData, tagsData, transactionsData,
      crmContactsData, crmContactLogsData, crmGroupsData, crmGroupMembersData,
      crmEventsData, crmEventParticipantsData, crmRelationshipsData,
    ] = await Promise.all([
      db.select().from(ledgers).orderBy(asc(ledgers.id)),
      db.select().from(category_groups).orderBy(asc(category_groups.id)),
      db.select().from(categories).orderBy(asc(categories.id)),
      db.select().from(tags).orderBy(asc(tags.id)),
      db.select().from(transactions).orderBy(asc(transactions.id)),
      db.select().from(crm_contacts).orderBy(asc(crm_contacts.id)),
      db.select().from(crm_contact_logs).orderBy(asc(crm_contact_logs.id)),
      db.select().from(crm_groups).orderBy(asc(crm_groups.id)),
      db.select().from(crm_group_members).orderBy(asc(crm_group_members.id)),
      db.select().from(crm_events).orderBy(asc(crm_events.id)),
      db.select().from(crm_event_participants).orderBy(asc(crm_event_participants.id)),
      db.select().from(crm_relationships).orderBy(asc(crm_relationships.id)),
    ]);

    const exportData = {
      version: 2,
      exported_at: new Date().toISOString(),
      data: {
        ledgers: ledgersData,
        category_groups: categoryGroupsData,
        categories: categoriesData,
        tags: tagsData,
        transactions: transactionsData,
        crm_contacts: crmContactsData,
        crm_contact_logs: crmContactLogsData,
        crm_groups: crmGroupsData,
        crm_group_members: crmGroupMembersData,
        crm_events: crmEventsData,
        crm_event_participants: crmEventParticipantsData,
        crm_relationships: crmRelationshipsData,
      },
    };

    return NextResponse.json({ success: true, data: exportData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "导出失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 从 JSON 数据导入（用于从 Git 拉取后恢复）
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();
  try {
    const db = getDb();
    const body = await request.json();
    const { data: importData, mode } = body as {
      data: {
        ledgers?: Record<string, unknown>[];
        category_groups?: Record<string, unknown>[];
        categories?: Record<string, unknown>[];
        tags?: Record<string, unknown>[];
        transactions?: Record<string, unknown>[];
        crm_contacts?: Record<string, unknown>[];
        crm_contact_logs?: Record<string, unknown>[];
        crm_groups?: Record<string, unknown>[];
        crm_group_members?: Record<string, unknown>[];
        crm_events?: Record<string, unknown>[];
        crm_event_participants?: Record<string, unknown>[];
        crm_relationships?: Record<string, unknown>[];
      };
      mode: "merge" | "replace";
    };

    if (!importData) {
      return NextResponse.json({ success: false, error: "缺少导入数据" }, { status: 400 });
    }

    const results = {
      ledgers: 0, category_groups: 0, categories: 0, tags: 0, transactions: 0,
      crm_contacts: 0, crm_contact_logs: 0, crm_groups: 0, crm_group_members: 0,
      crm_events: 0, crm_event_participants: 0, crm_relationships: 0,
    };

    // replace 模式：先清空再导入（注意外键顺序）
    if (mode === "replace") {
      // 删除子表
      await Promise.all([
        db.delete(crm_relationships),
        db.delete(crm_event_participants),
        db.delete(crm_group_members),
        db.delete(crm_contact_logs),
      ]);
      // 删除中间层
      await Promise.all([
        db.delete(crm_events),
        db.delete(crm_groups),
        db.delete(crm_contacts),
      ]);
      // 删除父表
      await Promise.all([
        db.delete(transactions),
        db.delete(tags),
        db.delete(categories),
        db.delete(category_groups),
        db.delete(ledgers),
      ]);
    }

    // 导入各表数据（使用 runSqlForUpsert 做 INSERT OR REPLACE）
    const tableImports: Array<{ key: keyof typeof results; data?: Record<string, unknown>[]; table: string }> = [
      { key: "ledgers", data: importData.ledgers, table: "ledgers" },
      { key: "category_groups", data: importData.category_groups, table: "category_groups" },
      { key: "categories", data: importData.categories, table: "categories" },
      { key: "tags", data: importData.tags, table: "tags" },
      { key: "transactions", data: importData.transactions, table: "transactions" },
      { key: "crm_contacts", data: importData.crm_contacts, table: "crm_contacts" },
      { key: "crm_contact_logs", data: importData.crm_contact_logs, table: "crm_contact_logs" },
      { key: "crm_groups", data: importData.crm_groups, table: "crm_groups" },
      { key: "crm_group_members", data: importData.crm_group_members, table: "crm_group_members" },
      { key: "crm_events", data: importData.crm_events, table: "crm_events" },
      { key: "crm_event_participants", data: importData.crm_event_participants, table: "crm_event_participants" },
      { key: "crm_relationships", data: importData.crm_relationships, table: "crm_relationships" },
    ];

    for (const { key, data, table } of tableImports) {
      if (!data?.length) continue;
      try {
        for (const row of data) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = columns.map(() => "?").join(", ");
          const colList = columns.join(", ");
          const updates = columns.filter((c) => c !== "id").map((c) => `${c} = excluded.${c}`).join(", ");
          const upsertSql = `INSERT OR REPLACE INTO ${table} (${colList}) VALUES (${placeholders})`;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (db as any).run(drizzleSql.raw(upsertSql), values);
          results[key]++;
        }
      } catch (e) {
        console.error(`导入${table}失败:`, e);
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "导入失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
