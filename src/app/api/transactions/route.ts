import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { transactions, categories } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { eq, desc, asc, and, gte, lte, like, sql } from "drizzle-orm";

// 获取交易列表
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const url = new URL(request.url);
    const ledger_id = url.searchParams.get("ledger_id");
    const type = url.searchParams.get("type");
    const category_id = url.searchParams.get("category_id");
    const search = url.searchParams.get("search");
    const start_date = url.searchParams.get("start_date");
    const end_date = url.searchParams.get("end_date");
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    if (!ledger_id) {
      return NextResponse.json({ success: false, error: "缺少 ledger_id" }, { status: 400 });
    }

    const db = getDb();
    const conditions = [eq(transactions.ledger_id, parseInt(ledger_id, 10))];
    if (type) conditions.push(eq(transactions.type, type as "income" | "expense"));
    if (category_id) conditions.push(eq(transactions.category_id, parseInt(category_id, 10)));
    if (search) conditions.push(like(transactions.description, `%${search}%`));
    if (start_date) conditions.push(gte(transactions.transaction_date, start_date));
    if (end_date) conditions.push(lte(transactions.transaction_date, end_date));

    const data = await db
      .select({
        transaction: transactions,
        category_name: categories.name,
        category_color: categories.color,
        category_icon: categories.icon,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.category_id, categories.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.transaction_date), desc(transactions.id))
      .limit(limit)
      .offset(offset);

    // 格式化结果：合并 category 信息到 transaction 对象
    const formatted = data.map((row) => ({
      ...row.transaction,
      category_name: row.category_name,
      category_color: row.category_color,
      category_icon: row.category_icon,
    }));

    // 总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(...conditions));
    const total = countResult[0]?.count ?? 0;

    return NextResponse.json({ success: true, data: formatted, total });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 创建交易记录
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const body = await request.json();
    const { ledger_id, amount, type, category_id, description, transaction_date, tag_ids } = body;

    if (!ledger_id || !amount || !type) {
      return NextResponse.json(
        { success: false, error: "缺少必要字段 (ledger_id, amount, type)" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = await db
      .insert(transactions)
      .values({
        ledger_id: parseInt(ledger_id, 10),
        amount: String(amount),
        type,
        category_id: category_id ? parseInt(category_id, 10) : null,
        description: description?.trim() || null,
        transaction_date: transaction_date || new Date().toISOString().slice(0, 10),
        tag_ids: tag_ids ? JSON.stringify(tag_ids) : null,
      })
      .returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
