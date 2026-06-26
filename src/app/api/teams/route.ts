import { NextRequest, NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { getDb } from "@/storage/database/sqlite-client";
import { ledgers, teams, todos } from "@/storage/database/shared/schema";

type TeamPayload = {
  name?: unknown;
  color?: unknown;
  description?: unknown;
  sort_order?: unknown;
};

function normalizeString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function normalizeSortOrder(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return 0;
}

// 获取团队列表
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const db = getDb();
    const data = await db
      .select({
        id: teams.id,
        name: teams.name,
        color: teams.color,
        description: teams.description,
        sort_order: teams.sort_order,
        created_at: teams.created_at,
        updated_at: teams.updated_at,
        ledgerCount: sql<number>`count(distinct ${ledgers.id})`,
        todoCount: sql<number>`count(distinct ${todos.id})`,
      })
      .from(teams)
      .leftJoin(ledgers, eq(ledgers.team_id, teams.id))
      .leftJoin(todos, eq(todos.team_id, teams.id))
      .groupBy(teams.id)
      .orderBy(asc(teams.sort_order), asc(teams.created_at));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 创建团队
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const body = (await request.json()) as TeamPayload;
    const name = normalizeString(body.name);

    if (!name) {
      return NextResponse.json(
        { success: false, error: "团队名称不能为空" },
        { status: 400 },
      );
    }

    const db = getDb();
    const result = await db
      .insert(teams)
      .values({
        name,
        color: normalizeString(body.color),
        description: normalizeString(body.description),
        sort_order: normalizeSortOrder(body.sort_order),
      })
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
