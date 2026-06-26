import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { transactions, categories } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import type { StatsResponse, TransactionType } from "@/lib/types";
import { eq, and, gte, lte, asc } from "drizzle-orm";

// 获取统计数据
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const params = request.nextUrl.searchParams;
    const ledgerId = params.get("ledger_id");
    const startDate = params.get("start_date");
    const endDate = params.get("end_date");

    if (!ledgerId) {
      return NextResponse.json(
        { success: false, error: "缺少 ledger_id 参数" },
        { status: 400 }
      );
    }

    const db = getDb();

    // 构建查询条件
    const conditions = [eq(transactions.ledger_id, parseInt(ledgerId, 10))];
    if (startDate) conditions.push(gte(transactions.transaction_date, startDate));
    if (endDate) conditions.push(lte(transactions.transaction_date, endDate + "T23:59:59"));

    const txList = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(asc(transactions.transaction_date));

    // 计算总收入/总支出
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    const categoryMap: Record<
      number,
      { category_id: number; category_name: string; type: TransactionType; total: number; count: number; color: string | null; icon: string | null }
    > = {};
    const dailyMap: Record<string, { date: string; income: number; expense: number }> = {};

    // 先获取所有分类信息
    const categoryIds = [...new Set(txList.map((t) => t.category_id).filter((id): id is number => id !== null))];
    const categoryInfo: Record<number, { name: string; type: string; color: string | null; icon: string | null }> = {};

    if (categoryIds.length > 0) {
      const cats = await db
        .select()
        .from(categories)
        .where(eq(categories.ledger_id, parseInt(ledgerId, 10)));

      for (const cat of cats) {
        categoryInfo[cat.id] = {
          name: cat.name,
          type: cat.type,
          color: cat.color,
          icon: cat.icon,
        };
      }
    }

    for (const tx of txList) {
      const amount = parseFloat(tx.amount);
      if (isNaN(amount)) continue;

      if (tx.type === "income") {
        totalIncome += amount;
        incomeCount++;
      } else {
        totalExpense += amount;
        expenseCount++;
      }

      // 分类统计
      if (tx.category_id !== null) {
        const catInfo = categoryInfo[tx.category_id];
        const catKey = tx.category_id;
        if (!categoryMap[catKey]) {
          categoryMap[catKey] = {
            category_id: catKey,
            category_name: catInfo?.name || "未分类",
            type: tx.type as TransactionType,
            total: 0,
            count: 0,
            color: catInfo?.color || null,
            icon: catInfo?.icon || null,
          };
        }
        categoryMap[catKey].total += amount;
        categoryMap[catKey].count++;
      }

      // 日趋势统计
      const txDate = new Date(tx.transaction_date);
      const dateKey = txDate.toISOString().slice(0, 10);
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, income: 0, expense: 0 };
      }
      if (tx.type === "income") {
        dailyMap[dateKey].income += amount;
      } else {
        dailyMap[dateKey].expense += amount;
      }
    }

    const stats: StatsResponse = {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netBalance: Math.round((totalIncome - totalExpense) * 100) / 100,
      transactionCount: txList.length,
      incomeCount,
      expenseCount,
      categoryBreakdown: Object.values(categoryMap)
        .map((c) => ({
          ...c,
          total: Math.round(c.total * 100) / 100,
        }))
        .sort((a, b) => b.total - a.total),
      dailyTrend: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)),
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
