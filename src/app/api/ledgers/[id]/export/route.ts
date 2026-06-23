import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { ledgers, category_groups, categories, tags, transactions } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { eq, gte, lte, asc } from "drizzle-orm";

// 账本导出：支持整本/时间段筛选，JSON 或 CSV 格式
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id } = await params;
    const ledgerId = parseInt(id, 10);
    const sp = request.nextUrl.searchParams;
    const format = sp.get("format") || "json";
    const period = sp.get("period") || "all";
    const startDate = sp.get("start_date");
    const endDate = sp.get("end_date");

    const db = getDb();

    // 查询账本信息
    const ledgerRows = await db.select().from(ledgers).where(eq(ledgers.id, ledgerId)).limit(1);
    const ledger = ledgerRows[0];
    if (!ledger) {
      return NextResponse.json({ success: false, error: "账本不存在" }, { status: 404 });
    }

    // 构建 date filter
    let filterStart = "";
    let filterEnd = "";
    const now = new Date();
    if (period === "month") {
      const year = now.getFullYear();
      const month = now.getMonth();
      filterStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      filterEnd = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;
    } else if (period === "year") {
      filterStart = `${now.getFullYear()}-01-01`;
      filterEnd = `${now.getFullYear()}-12-31`;
    } else if (period === "custom") {
      if (!startDate || !endDate) {
        return NextResponse.json({ success: false, error: "自定义时间段需提供 start_date 和 end_date" }, { status: 400 });
      }
      filterStart = startDate;
      filterEnd = endDate;
    }

    // 查询分类分组
    const groups = await db.select().from(category_groups).where(eq(category_groups.ledger_id, ledgerId)).orderBy(asc(category_groups.sort_order));

    // 查询分类
    const cats = await db.select().from(categories).where(eq(categories.ledger_id, ledgerId)).orderBy(asc(categories.sort_order));

    // 查询标签
    const tagRows = await db.select().from(tags).where(eq(tags.ledger_id, ledgerId));

    // 查询交易记录
    const txConditions = [eq(transactions.ledger_id, ledgerId)];
    if (filterStart) txConditions.push(gte(transactions.transaction_date, filterStart));
    if (filterEnd) txConditions.push(lte(transactions.transaction_date, filterEnd + "T23:59:59"));

    const txRows = await db.select().from(transactions).where(
      txConditions.length === 1 ? txConditions[0] : { AND: txConditions } as never
    ).orderBy(asc(transactions.transaction_date));

    // 构建 category map
    const catMap = new Map<number, { name: string; type: string; group?: string }>();
    for (const cat of cats) {
      const group = groups.find((g) => g.id === cat.group_id);
      catMap.set(cat.id, { name: cat.name, type: cat.type, group: group?.name });
    }

    // 构建 tag map
    const tagMap = new Map<number, string>();
    for (const tag of tagRows) {
      tagMap.set(tag.id, tag.name);
    }

    const periodLabel = period === "all" ? "全部"
      : period === "month" ? "本月"
      : period === "year" ? "全年"
      : `${filterStart} ~ ${filterEnd}`;

    if (format === "csv") {
      const BOM = "\uFEFF";
      const header = "日期,类型,分类,分组,金额,描述,标签\n";
      const rows = txRows.map((tx) => {
        const cat = catMap.get(tx.category_id ?? 0);
        const tagIdsRaw = tx.tag_ids;
        const tagIds: number[] = Array.isArray(tagIdsRaw)
          ? tagIdsRaw as number[]
          : (typeof tagIdsRaw === "string" ? JSON.parse(tagIdsRaw) as number[] : []);
        const tagNames = tagIds.map((tid: number) => tagMap.get(tid) || "").filter(Boolean).join("|");
        return [
          tx.transaction_date,
          tx.type === "income" ? "收入" : "支出",
          cat?.name || "未分类",
          cat?.group || "",
          String(tx.amount),
          (tx.description || "").replace(/"/g, '""'),
          tagNames,
        ].map((v) => `"${v}"`).join(",");
      }).join("\n");

      const csv = BOM + header + rows;
      const filename = `${ledger.name}_${periodLabel}_导出.csv`;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    }

    // JSON 格式
    const exportData = {
      version: 2,
      exported_at: new Date().toISOString(),
      period: periodLabel,
      ledger: {
        id: ledger.id,
        name: ledger.name,
        description: ledger.description,
        currency: ledger.currency,
        initial_balance: ledger.initial_balance,
      },
      data: {
        category_groups: groups,
        categories: cats,
        tags: tagRows,
        transactions: txRows,
      },
    };

    const filename = `${ledger.name}_${periodLabel}_导出.json`;
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    const message = err instanceof Error ? err.message : "导出失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
