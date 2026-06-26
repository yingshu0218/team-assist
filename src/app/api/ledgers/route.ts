import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { ledgers, category_groups, categories, teams } from "@/storage/database/shared/schema";
import { DEFAULT_EXPENSE_GROUPS, DEFAULT_INCOME_GROUPS } from "@/lib/constants";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { normalizeOptionalId } from "@/lib/todos";
import { asc, eq } from "drizzle-orm";

// 获取账本列表
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const db = getDb();
    const data = await db
      .select()
      .from(ledgers)
      .orderBy(asc(ledgers.created_at));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 创建账本（同时初始化默认分类）
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const body = await request.json();
    const { name, description, currency = "CNY", initial_balance = "0" } = body;
    let teamId: number | null;

    try {
      teamId = normalizeOptionalId(body.team_id) ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ID 必须是正整数或 none";
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "账本名称不能为空" },
        { status: 400 }
      );
    }

    const db = getDb();
    if (teamId !== null) {
      const teamResult = await db
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);

      if (!teamResult[0]) {
        return NextResponse.json({ success: false, error: "团队不存在" }, { status: 400 });
      }
    }

    // 创建账本
    const ledgerResult = await db
      .insert(ledgers)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        currency,
        initial_balance: String(initial_balance),
        is_active: true,
        team_id: teamId,
      })
      .returning();

    const ledger = ledgerResult[0];
    if (!ledger) throw new Error("创建账本失败: 未返回数据");

    // 初始化默认分类分组
    const allGroupEntries = [
      ...DEFAULT_EXPENSE_GROUPS.map((g, idx) => ({
        ledger_id: ledger.id,
        name: g.name,
        type: "expense" as const,
        icon: g.icon,
        sort_order: idx,
      })),
      ...DEFAULT_INCOME_GROUPS.map((g, idx) => ({
        ledger_id: ledger.id,
        name: g.name,
        type: "income" as const,
        icon: g.icon,
        sort_order: idx,
      })),
    ];

    const insertedGroups = await db
      .insert(category_groups)
      .values(allGroupEntries)
      .returning();

    // 建立 name -> id 映射
    const groupNameToId = new Map<string, number>();
    allGroupEntries.forEach((entry, i) => {
      if (insertedGroups[i]) {
        groupNameToId.set(entry.name, insertedGroups[i].id);
      }
    });

    // 创建分类并关联分组
    const allCategoriesToInsert: Array<{
      ledger_id: number;
      group_id: number | null;
      name: string;
      type: "income" | "expense";
      icon: string | null;
      color: string | null;
      sort_order: number;
    }> = [];

    DEFAULT_EXPENSE_GROUPS.forEach((group) => {
      const groupId = groupNameToId.get(group.name) || null;
      group.categories.forEach((cat, catIdx) => {
        allCategoriesToInsert.push({
          ledger_id: ledger.id,
          group_id: groupId,
          name: cat.name,
          type: "expense",
          icon: cat.icon,
          color: cat.color,
          sort_order: catIdx,
        });
      });
    });

    DEFAULT_INCOME_GROUPS.forEach((group) => {
      const groupId = groupNameToId.get(group.name) || null;
      group.categories.forEach((cat, catIdx) => {
        allCategoriesToInsert.push({
          ledger_id: ledger.id,
          group_id: groupId,
          name: cat.name,
          type: "income",
          icon: cat.icon,
          color: cat.color,
          sort_order: catIdx,
        });
      });
    });

    await db.insert(categories).values(allCategoriesToInsert);

    return NextResponse.json({ success: true, data: ledger });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
