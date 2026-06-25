import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { getDb } from "@/storage/database/sqlite-client";
import { ledgers, teams, todos } from "@/storage/database/shared/schema";

type TeamPayload = {
  name?: unknown;
  color?: unknown;
  description?: unknown;
  sort_order?: unknown;
};

function parseTeamId(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

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

async function findTeam(id: number) {
  const db = getDb();
  const result = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  return result[0] ?? null;
}

async function findTeamWithCounts(id: number) {
  const db = getDb();
  const result = await db
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
    .where(eq(teams.id, id))
    .groupBy(teams.id)
    .limit(1);

  return result[0] ?? null;
}

// 获取单个团队
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id: rawId } = await params;
    const id = parseTeamId(rawId);
    if (!id) {
      return NextResponse.json({ success: false, error: "无效团队 ID" }, { status: 400 });
    }

    const team = await findTeamWithCounts(id);
    if (!team) {
      return NextResponse.json({ success: false, error: "团队不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: team });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 更新团队
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id: rawId } = await params;
    const id = parseTeamId(rawId);
    if (!id) {
      return NextResponse.json({ success: false, error: "无效团队 ID" }, { status: 400 });
    }

    const body = (await request.json()) as TeamPayload;
    const name = normalizeString(body.name);
    if (!name) {
      return NextResponse.json(
        { success: false, error: "团队名称不能为空" },
        { status: 400 },
      );
    }

    const existing = await findTeam(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "团队不存在" }, { status: 404 });
    }

    const db = getDb();
    const result = await db
      .update(teams)
      .set({
        name,
        color: normalizeString(body.color),
        description: normalizeString(body.description),
        sort_order: normalizeSortOrder(body.sort_order),
        updated_at: new Date().toISOString(),
      })
      .where(eq(teams.id, id))
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 删除团队（账本和待办的 team_id 自动 SET NULL — schema 中定义了）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id: rawId } = await params;
    const id = parseTeamId(rawId);
    if (!id) {
      return NextResponse.json({ success: false, error: "无效团队 ID" }, { status: 400 });
    }

    const existing = await findTeam(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "团队不存在" }, { status: 404 });
    }

    const db = getDb();
    await db.delete(teams).where(eq(teams.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
